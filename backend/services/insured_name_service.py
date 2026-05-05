"""
insured_name_service.py — Normalisation des noms d'assurés

Deux passes :
  1. Nettoyage regex  — supprime les suffixes contractuels parasites
                        (tranches, XL/XOL, QS/SP, branches, lignes, mécanismes…)
  2. Fuzzy matching   — regroupe les noms quasi-identiques (RapidFuzz WRatio ≥ THRESHOLD)

Résultat stocké dans la colonne INSURED_NAME_NORM (colonne originale préservée).
Les paires ambiguës (confidence=Fuzzy) sont loggées dans le logger backend.

Dépendances (déjà présentes dans le projet) :
    rapidfuzz, pandas
"""

import re
import logging
import unicodedata
from typing import Optional

import pandas as pd
from rapidfuzz import fuzz, process as fuzz_process

logger = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────────────────────
FUZZY_THRESHOLD: int = 90          # seuil WRatio pour fusion (0–100)
                                    # 90% : évite les faux positifs token-based (WRatio = partial match)
MIN_FUZZY_LEN: int = 15            # longueur minimale (chars) pour participer au fuzzy grouping
                                    # les noms courts (<15) restent tels quels après Passe 1
MAX_LEN_RATIO: float = 2.5         # ratio max entre les longueurs des deux noms comparés
                                    # si l'un est 2.5× plus long → pas de fusion (partial ratio biaisé)
INSURED_COL: str = "INSURED_NAME"
NORM_COL: str = "INSURED_NAME_NORM"

# ── Patterns regex (ordonnés — NE PAS changer l'ordre) ────────────────────────
#
# Chaque pattern est appliqué en remplacement par "" sur le nom uppercasé.
# L'ordre est critique : on supprime d'abord les suffixes les plus longs/spécifiques.
#
_SUFFIX_PATTERNS: list[re.Pattern] = [p for p in (re.compile(pat, re.IGNORECASE) for pat in [

    # ── 1. Garbage de tête  (?., -, \t, *, %) ──────────────────────────────
    r"^[\s?.,\-\t*%]+",

    # ── 2. Tranches numérotées ──────────────────────────────────────────────
    # 1ERE TR / 2EME TRANCHE / 1ST LY / 2ND LAYER / LAYER 3 / SUBLAYER / RETRO LAYER02
    r"\b(?:1[EÈ]?R?E?|2[EÈ]?M?E?|3[EÈ]?M?E?|[1-9](?:ST|ND|RD|TH)?)\s*"
    r"(?:TR(?:ANCHE)?|LAYER|LY|SUBLAYER|RETRO\s*LAYER\s*\d*)\b",
    # LAYER seul (avec numéro)
    r"\bLAYER\s*\d+\b",
    # RETRO seul en fin (après suppression RETRO LAYER)
    r"\bRETRO\b",
    # SUBLAYER seul
    r"\bSUBLAYER\b",

    # ── 3. Excess of Loss ───────────────────────────────────────────────────
    # CAT 1XL … CAT 8XL
    r"\bCAT\s*[1-8]?\s*XL\b",
    # 1XL … 8XL  /  XL1 … XL5
    r"\b[1-8]XL\b",
    r"\bXL[1-8]\b",
    # XL/R  XL/EVT  XL/RISQUE  XL/TETE  XL/R
    r"\bXL\s*/\s*(?:R|EVT|RISQUE|TETE|RISK)\b",
    # XOL
    r"\bXOL\b",
    # XL seul (après les variantes)
    r"\bXL(?:\s*/\s*EVT)?\b",
    # 1L … 6L  (layers courts)
    r"\b[1-6]L\b",

    # ── 4. Quote Share / Surplus ────────────────────────────────────────────
    # QS/SPS  QS/SPL  QS/S1  QS/S2  QS/SP
    r"\bQS\s*/\s*(?:SP[SL]?|S[1-9])\b",
    # QS seul
    r"\bQS\b",
    # XSB
    r"\bXSB\b",
    # SPL / SPS / SP seul
    r"\bSP[SL]?\b",
    # SURPLUS
    r"\bSURPLUS\b",

    # ── 5. Branches en suffixe (FIRE QS, ENG QS, ENGG QS, CARGO QS, etc.) ──
    # Ces patterns arrivent APRÈS suppression QS/SP (sinon double match)
    r"\b(?:FIRE|ENG(?:G|INEERING)?|CARGO|HULL|ACC(?:IDENT)?|MOTOR|MARINE|LIAB(?:ILITY)?|PA|NM)\b",

    # ── 6. Ligne / programme ────────────────────────────────────────────────
    # LIGNE 1 … LIGNE 4  /  1ERE LIGNE  /  2EME LIGNE
    r"\bLIGNE\s*[1-4]\b",
    r"\b[12][EÈ]?R?M?E?\s*LIGNE\b",
    # T1 … T5
    r"\bT[1-5]\b",
    # /S1  /S2  /S3  /S4
    r"/\s*S[1-9]\b",

    # ── 7. Mécanismes traités ───────────────────────────────────────────────
    r"\bTRS\b",
    r"\bATS\b",
    r"\bEDP\b",
    r"\bPAR\s*QS\b",
    r"\bFF\s*FACILITY\b",
    r"\bD\s*[&E]\s*O\b",

    # ── 8. Résidus fréquents ────────────────────────────────────────────────
    r"\bRISQUE\s*[&E]\s*EVT\b",
    r"&\s*EVT\b",
    r"\bEVT\b",
    r"\bGENE?\b",            # GENE / GEN (abréviation de GENERAL)

    # ── 9. Séparateurs résiduels en fin / début ─────────────────────────────
    r"[\-:/|]+\s*$",         # séparateur en fin
    r"^\s*[\-:/|]+",         # séparateur en début

])]


# ── Passe 0 : Entités connues — préfixe ancre ─────────────────────────────────
#
# Chaque entrée : (pattern_regex, canonical_name)
# Pattern appliqué au DÉBUT du nom (re.match) après upper() + strip().
# Si match → retourne directement canonical_name (court-circuite tout le reste).
#
# Règle de rédaction des patterns :
#   - Commencer toujours par l'acronyme ou mot-clé principal
#   - Utiliser \b pour les acronymes (évite "OCP" dans "OCPB")
#   - Le pattern est volontairement large pour attraper les projets/filiales
#
_KNOWN_ENTITY_ANCHORS: list[tuple[re.Pattern, str]] = [
    (p, name) for p, name in (
        (re.compile(pat, re.IGNORECASE), name)
        for pat, name in [

            # ══════════════════════════════════════════════════════════════
            # MAROC — Grands comptes industriels & infrastructure
            # ══════════════════════════════════════════════════════════════

            # OCP — Office Chérifien des Phosphates (phosphate, chimie, logistique)
            # Couvre : OCP/ARCHORODON, OCP FIRE QS, OCP/REALISATION, PHOSBOUCRAA, O.C.P
            (r"^OCP\b",                          "OCP"),
            (r"^O\.C\.P\b",                      "OCP"),   # variante avec points
            (r"^PHOSBOUCRAA\b",                  "OCP"),
            (r"^OFFICE CHERIFIEN DES PHOSPHATES", "OCP"),

            # ACWA Power — projets ENR (Noor, Hajr, Laayoune…)
            (r"^ACWA\b",                         "ACWA Power"),

            # MASEN — Agence marocaine énergie solaire (projets NOOR)
            (r"^MASEN\b",                        "MASEN"),
            # NOOR TAKAFUL (UAE) — DOIT être avant NOOR générique pour éviter le masquage
            (r"^NOOR TAKAFUL\b",                 "Noor Takaful"),
            (r"^NOOR\b",                         "MASEN"),          # NOOR OUARZAZATE, NOOR MIDELT…

            # Nareva / Théolia — éolien
            (r"^NAREVA\b",                       "Nareva"),
            (r"^THEOLIA\b",                      "Nareva"),

            # OCP Engineering / SADV / filiales OCP
            (r"^SADV\b",                         "OCP"),

            # Renault / Somaca — automobile
            (r"^RENAULT\b",                      "Renault Maroc"),
            (r"^SOMACA\b",                       "Renault Maroc"),

            # Stellantis / PSA / Citroën
            (r"^STELLANTIS\b",                   "Stellantis Maroc"),
            (r"^PSA\b",                          "Stellantis Maroc"),

            # Equipementiers auto
            (r"^YAZAKI\b",                       "Yazaki Maroc"),
            (r"^LEONI\b",                        "Leoni Maroc"),
            (r"^DELPHI\b",                       "Aptiv / Delphi"),
            (r"^APTIV\b",                        "Aptiv / Delphi"),
            (r"^SUMITOMO\b",                     "Sumitomo Electric"),
            (r"^VALEO\b",                        "Valeo Maroc"),
            (r"^LEAR\b",                         "Lear Corporation"),

            # Cosumar — sucre
            (r"^COSUMAR\b",                      "Cosumar"),

            # Holcim / Asment / CBM — ciment
            (r"^HOLCIM\b",                       "Holcim Maroc"),
            (r"^ASMENT\b",                       "Asment Temara"),
            (r"^CBM\b",                          "CBM Ciment"),
            (r"^CIMENTS DU MAROC\b",             "Ciments du Maroc"),
            (r"^LAFARGE\b",                      "Lafarge Maroc"),

            # SAMIR — raffinerie
            (r"^SAMIR\b",                        "SAMIR"),

            # Managem — mines
            (r"^MANAGEM\b",                      "Managem"),

            # CIH / Attijariwafa / BCP / AWB — banques
            (r"^ATTIJARIWAFA\b",                 "Attijariwafa Bank"),
            (r"^ATW\b",                          "Attijariwafa Bank"),
            (r"^BANQUE POPULAIRE\b",             "Banque Populaire"),
            (r"^BCP\b",                          "Banque Populaire"),
            (r"^CIH\b",                          "CIH Bank"),
            (r"^BMCE\b",                         "Bank of Africa"),
            (r"^BANK OF AFRICA\b",               "Bank of Africa"),
            (r"^BOA\b",                          "Bank of Africa"),
            (r"^BMCI\b",                         "BMCI"),

            # CDG — Caisse de Dépôt et de Gestion
            (r"^CDG\b",                          "CDG"),

            # ONCF — rail
            (r"^ONCF\b",                         "ONCF"),

            # RAM — Royal Air Maroc
            (r"^ROYAL AIR MAROC\b",              "Royal Air Maroc"),
            (r"^RAM\b",                          "Royal Air Maroc"),

            # Marsa Maroc — ports
            (r"^MARSA MAROC\b",                  "Marsa Maroc"),
            (r"^ANP\b",                          "Marsa Maroc"),

            # LYDEC / REDAL / RADEEC — utilities
            (r"^LYDEC\b",                        "Lydec"),
            (r"^REDAL\b",                        "Redal"),
            (r"^RADEEC\b",                       "Radeec"),
            (r"^AMENSOUSS\b",                    "Amensouss"),

            # Somagec — BTP
            (r"^SOMAGEC\b",                      "SOMAGEC"),

            # Al Omrane — immobilier
            (r"^AL OMRANE\b",                    "Al Omrane"),

            # Addoha / Alliances — promotion immo
            (r"^ADDOHA\b",                       "Addoha"),
            (r"^ALLIANCES\b",                    "Alliances"),

            # Marjane / Label'Vie — retail
            (r"^MARJANE\b",                      "Marjane"),
            (r"^LABEL.?VIE\b",                   "Label'Vie"),

            # Safi Energy / Jorf Lasfar (centrales thermiques)
            (r"^SAFI ENERGY\b",                  "Safi Energy"),
            (r"^JORF LASFAR ENERGY\b",           "Jorf Lasfar Energy"),
            (r"^JLEC\b",                         "Jorf Lasfar Energy"),
            (r"^TAQA MOROCCO\b",                 "TAQA Morocco"),
            (r"^TAQA\b",                         "TAQA"),

            # Tanger Med — port
            (r"^TANGER MED\b",                   "Tanger Med"),
            (r"^TMSA\b",                         "Tanger Med"),

            # Sonacos / SONASID — acier
            (r"^SONASID\b",                      "Sonasid"),

            # ══════════════════════════════════════════════════════════════
            # GOLFE & MOYEN-ORIENT
            # ══════════════════════════════════════════════════════════════

            # Saudi Aramco
            (r"^ARAMCO\b",                       "Saudi Aramco"),
            (r"^SAUDI ARAMCO\b",                 "Saudi Aramco"),

            # ADNOC — Abu Dhabi National Oil Company
            (r"^ADNOC\b",                        "ADNOC"),

            # SABIC — chimie
            (r"^SABIC\b",                        "SABIC"),

            # Emirates / Etihad / Qatar Airways
            (r"^EMIRATES\b",                     "Emirates Airlines"),
            (r"^ETIHAD\b",                       "Etihad Airways"),
            (r"^QATAR AIRWAYS\b",                "Qatar Airways"),

            # Saudi Electricity Company
            (r"^SEC\b",                          "Saudi Electricity Company"),
            (r"^SAUDI ELECTRICITY\b",            "Saudi Electricity Company"),

            # ENGIE / Total — énergie
            (r"^ENGIE\b",                        "Engie"),
            (r"^TOTALENERGIES\b",                "TotalEnergies"),
            (r"^TOTAL EREN\b",                   "TotalEnergies"),

            # ══════════════════════════════════════════════════════════════
            # AFRIQUE SUBSAHARIENNE — Grands comptes
            # ══════════════════════════════════════════════════════════════

            # SONATEL — télécom Sénégal
            (r"^SONATEL\b",                      "Sonatel"),

            # SONATRACH — pétrole Algérie
            (r"^SONATRACH\b",                    "Sonatrach"),

            # COTCO / SONARA — Cameroun
            (r"^SONARA\b",                       "Sonara"),
            (r"^COTCO\b",                        "COTCO"),

            # ══════════════════════════════════════════════════════════════
            # BTP / ENGINEERING — multinationales
            # ══════════════════════════════════════════════════════════════

            (r"^VINCI\b",                        "Vinci"),
            (r"^BOUYGUES\b",                     "Bouygues"),
            (r"^COLAS\b",                        "Colas"),
            (r"^ALSTOM\b",                       "Alstom"),
            (r"^SIEMENS\b",                      "Siemens"),
            (r"^SCHNEIDER\b",                    "Schneider Electric"),
            (r"^ABB\b",                          "ABB"),
            (r"^GENERAL ELECTRIC\b",             "GE"),
            (r"^GE\b",                           "GE"),
            (r"^EIFFAGE\b",                      "Eiffage"),
            (r"^SOGEA\b",                        "Sogea Satom"),
            (r"^SATOM\b",                        "Sogea Satom"),

            # ══════════════════════════════════════════════════════════════
            # ÉNERGIE & INDUSTRIE — découverts dans la base
            # ══════════════════════════════════════════════════════════════

            # Safi Energy / SAFIEC — centrale thermique Safi
            (r"^SAFI ENERGY\b",                  "Safi Energy"),
            (r"^SAFI IPP\b",                     "Safi Energy"),
            (r"^SAFIEC\b",                       "Safi Energy"),

            # Vivo Energy — distribution pétrolière (ex-Shell Maroc)
            (r"^VIVO ENERGY\b",                  "Vivo Energy"),
            (r"^VIVO\b",                         "Vivo Energy"),

            # Petrocab — transport pétrolier Maroc
            (r"^PETROCAB\b",                     "Petrocab"),

            # Petrom / Petromaroc — exploration
            (r"^PETROM\b",                       "Petrom"),
            (r"^PETROMAROC\b",                   "Petromaroc"),

            # Suez Canal Authority — Égypte
            (r"^SUEZ CANAL\b",                   "Suez Canal Authority"),
            (r"^SUEZ\b",                         "Suez"),

            # Ethiopian Airlines — compagnie nationale Éthiopie
            (r"^ETHIOPIAN AIRLINES\b",           "Ethiopian Airlines"),
            (r"^ETHIOPIAN\b",                    "Ethiopian"),

            # Nakheel — promoteur immobilier Dubai
            (r"^NAKHEEL\b",                      "Nakheel"),

            # APRAM — association agents maritimes Maroc
            (r"^APRAM\b",                        "APRAM"),

            # Kuwait Airways
            (r"^KUWAIT AIRWAYS\b",               "Kuwait Airways"),

            # ══════════════════════════════════════════════════════════════
            # ASSUREURS MAROCAINS — entités cédantes du portefeuille
            # ══════════════════════════════════════════════════════════════

            # MAMDA / MCMA — assurance agricole Maroc
            (r"^MAMDA\b",                        "MAMDA"),
            (r"^MCMA\b",                         "MCMA"),

            # Wafa Assurance (Attijariwafa group)
            (r"^WAFA\b",                         "Wafa Assurance"),

            # SANAD — assurance maritime Maroc
            (r"^SANAD\b",                        "SANAD"),

            # CNIA Saada
            (r"^CNIA\b",                         "CNIA Saada"),

            # Atlanta Assurances
            (r"^ATLANTA\b",                      "Atlanta Assurances"),

            # Damane (ex-RMA Watanya)
            (r"^DAMANE\b",                       "Damane Assurances"),

            # Saham Re
            (r"^SAHAM\b",                        "Saham Re"),

            # SCG Re (Société Centrale de Réassurance)
            (r"^SCG RE\b",                       "SCG Re"),
            (r"^SCG\b",                          "SCG Re"),

            # ══════════════════════════════════════════════════════════════
            # ASSUREURS RÉGIONAUX (Afrique & MENA) — cédantes portfolio
            # ══════════════════════════════════════════════════════════════

            # Orient Insurance (UAE)
            (r"^ORIENT INS\b",                   "Orient Insurance"),
            (r"^ORIENT\b",                       "Orient"),

            # QIC — Qatar Insurance Company
            (r"^QIC\b",                          "QIC"),

            # NIC — National Insurance Company (Inde/autre)
            (r"^NIC\b",                          "NIC"),

            # Tanzindia Assurance (Tanzanie)
            (r"^TANZINDIA\b",                    "Tanzindia Assurance"),

            # Sheikan Insurance (Soudan)
            (r"^SHEIKAN\b",                      "Sheikan Insurance"),

            # Dhofar Insurance (Oman)
            (r"^DHOFAR INS\b",                   "Dhofar Insurance"),
            (r"^DHOFAR\b",                       "Dhofar"),

            # Medgulf — Medical Gulf (Arabie/Liban)
            (r"^MEDGULF\b",                      "Medgulf"),

            # Tibesty — compagnie d'assurance Tchad/Libye
            (r"^TIBESTY\b",                      "Tibesty Insurance"),

            # Trust Compass Insurance (UAE)
            (r"^TRUST COMPASS\b",                "Trust Compass Insurance"),
            (r"^TRUST\b",                        "Trust Insurance"),

            # PTA Re / ZEP-Re (Afrique orientale et australe)
            (r"^PTA\b",                          "ZEP-Re (PTA Re)"),

            # SIC — Société Ivoirienne de Crédit (ou Insurance Côte d'Ivoire)
            (r"^SIC\b",                          "SIC"),

            # SICOM — State Insurance Company of Mauritius
            (r"^SICOM\b",                        "SICOM"),

            # Madison Insurance (Zambie)
            (r"^MADISON\b",                      "Madison Insurance"),

            # Methaq Takaful (UAE)
            (r"^METHAQ\b",                       "Methaq Takaful"),

            # Wethaq Takaful (Kuwait)
            (r"^WETHAQ\b",                       "Wethaq Takaful"),


            # YAS Takaful / YAS Clinic (UAE)
            (r"^YAS TAKAFUL\b",                  "YAS Takaful"),
            (r"^YAS CLINIC\b",                   "YAS Clinic"),

            # SEIB Insurance (Qatar)
            (r"^SEIB\b",                         "SEIB Insurance"),

            # Enaya Insurance (Bahreïn)
            (r"^ENAYA\b",                        "Enaya Insurance"),

            # Zitouna Takaful (Tunisie)
            (r"^ZITOUNA\b",                      "Zitouna Takaful"),

            # Tamine Islamic Insurance (UAE)
            (r"^TAMINE\b",                       "Tamine Islamic Insurance"),

            # Sarwa Insurance (UAE)
            (r"^SARWA\b",                        "Sarwa Insurance"),

            # Awash Insurance (Éthiopie)
            (r"^AWASH\b",                        "Awash Insurance"),

            # Groupmed (MENA)
            (r"^GROUPMED\b",                     "Groupmed"),

            # Gunes Sigorta (Turquie)
            (r"^GUNES\b",                        "Gunes Sigorta"),

            # Fidelity Insurance (UAE)
            (r"^FIDELITY\b",                     "Fidelity Insurance"),

            # Star Assurance (Ghana)
            (r"^STAR\b",                         "Star Assurance"),

            # Lion Insurance (Sri Lanka)
            (r"^LION INS\b",                     "Lion Insurance"),

            # GIC (General Insurance Corporation of India)
            (r"^GIC\b",                          "GIC Re"),

            # Reliance Insurance
            (r"^RELIANCE\b",                     "Reliance Insurance"),

            # Misr Insurance (Égypte)
            (r"^MISR INS\b",                     "Misr Insurance"),
            (r"^MISR\b",                         "Misr"),

            # GAT — Garantie Assurances Tunisiennes
            (r"^GAT\b",                          "GAT Assurances"),

            # Arab Insurance Group
            (r"^ACIG\b",                         "Arab Co Insurance Group"),

            # Awael Insurance
            (r"^AWAEL\b",                        "Awael Insurance"),

            # Alsharq Insurance (Bahreïn/MENA)
            (r"^ALSHARQ\b",                      "Alsharq Insurance"),

            # LIC (Life Insurance Corporation India)
            (r"^LIC\b",                          "LIC India"),

            # ══════════════════════════════════════════════════════════════
            # ACIER / MINING — internationaux
            # ══════════════════════════════════════════════════════════════

            # ArcelorMittal — acier (Maroc, Inde, monde)
            (r"^ARCELORMITTAL\b",               "ArcelorMittal"),
            (r"^ARCELOR\b",                     "ArcelorMittal"),
            # ArcelorMittal Nippon Steel India
            (r"^AM\.?NS\b",                     "ArcelorMittal Nippon Steel India"),

            # JSW Steel / Cement (Inde)
            (r"^JSW\b",                         "JSW Group"),

            # Tata Group (Inde)
            (r"^TATA\b",                        "Tata Group"),
        ]
    )
]



def _match_known_entity(name: str) -> str | None:
    """
    Passe 0 — Détection d'entité connue par préfixe ancre.

    Si le nom (uppercasé, strippé) commence par un ancre connu,
    retourne directement le nom canonique.
    Retourne None si aucun ancre ne matche.
    """
    s = name.strip().upper()
    # Supprime d'abord le garbage de tête (?, ., -, etc.)
    s = re.sub(r"^[\s?.,\-\t*%]+", "", s).strip()
    for pat, canonical in _KNOWN_ENTITY_ANCHORS:
        if pat.match(s):
            return canonical
    return None


def _clean_one(name: str) -> str:
    """
    Normalise un nom d'assuré brut en 3 passes :

    Passe 0 : Détection d'entité connue (ancre préfixe)
              Si le nom commence par OCP, ACWA, RENAULT, etc. → retourne le canonique directement.

    Passe 1 : Nettoyage regex — supprime les suffixes contractuels parasites.

    (La Passe 2 fuzzy est appliquée en aval sur l'ensemble des noms uniques.)
    """
    if not isinstance(name, str) or not name.strip():
        return name

    # ── Passe 0 : entité connue ────────────────────────────────────────────────
    known = _match_known_entity(name)
    if known:
        return known

    # ── Passe 1 : regex suffixes ───────────────────────────────────────────────
    s = name.strip().upper()

    for pat in _SUFFIX_PATTERNS:
        s = pat.sub("", s).strip()

    # Normalise les espaces multiples
    s = re.sub(r"\s{2,}", " ", s).strip()
    return s if s else name.strip().upper()


# ── Ensembles des canoniques Passe 0 (utilisé dans normalize_insured_names) ────
# Précalculé une seule fois au démarrage du module.
_PASSE0_CANONICALS: set[str] = {canonical for _, canonical in _KNOWN_ENTITY_ANCHORS}


def _build_canonical_map(
    unique_names: list[str],
    frozen_names: set[str] | None = None,
) -> dict[str, str]:
    """
    Construit un dictionnaire {nom_nettoyé → nom_canonique}.

    Algorithme :
      - Les `frozen_names` (canoniques Passe 0) sont pré-seedés comme têtes de cluster
        IMMUTABLES : ils ne peuvent pas être absorbés dans un autre cluster.
      - Les autres noms sont triés par longueur décroissante.
      - Pour chaque nom candidat :
          1. Si longueur < MIN_FUZZY_LEN  → pas de fuzzy (reste isolé)
          2. Si ratio de longueur vs tête > MAX_LEN_RATIO → pas de match (partial ratio biaisé)
          3. Si WRatio ≥ FUZZY_THRESHOLD avec une tête existante → rattaché
          4. Sinon → nouveau cluster

    Complexité : O(N²) sur les noms uniques (typiquement < 7 000 → acceptable).
    """
    if not unique_names:
        return {}

    frozen_names = frozen_names or set()

    # canonical_map : nom → représentant canonique du cluster
    canonical_map: dict[str, str] = {}

    # cluster_heads : représentants actuels (triés par longueur déc)
    # Seed les frozen d'abord (immutables)
    frozen_heads: list[str] = sorted(frozen_names & set(unique_names), key=len, reverse=True)
    for name in frozen_heads:
        canonical_map[name] = name

    # cluster_heads : frozen d'abord, puis les autres
    cluster_heads: list[str] = list(frozen_heads)
    cluster_heads_frozen_set: set[str] = set(frozen_heads)

    # Noms non-frozen, triés par longueur déc
    non_frozen = sorted(
        [n for n in unique_names if n not in cluster_heads_frozen_set],
        key=len, reverse=True
    )

    fuzzy_pairs: list[tuple[str, str, float]] = []

    for name in non_frozen:
        if not name:
            canonical_map[name] = name
            continue

        # ── Garde 1 : longueur minimale ──────────────────────────────────
        if len(name) < MIN_FUZZY_LEN:
            canonical_map[name] = name
            if not cluster_heads:
                cluster_heads.append(name)
            continue

        if not cluster_heads:
            cluster_heads.append(name)
            canonical_map[name] = name
            continue

        # ── Garde 2 + WRatio : filtrer par ratio de longueur ─────────────
        # Construire la liste des têtes éligibles (longueur compatible)
        eligible_heads = [
            h for h in cluster_heads
            if len(h) >= MIN_FUZZY_LEN and
               max(len(name), len(h)) / max(min(len(name), len(h)), 1) <= MAX_LEN_RATIO
        ]

        match = None
        if eligible_heads:
            match = fuzz_process.extractOne(
                name,
                eligible_heads,
                scorer=fuzz.WRatio,
                score_cutoff=FUZZY_THRESHOLD,
            )

        if match:
            best_head, score, _ = match
            # ── Garde 3 : ne jamais fusionner deux canoniques Passe 0 ────
            if name in frozen_names and best_head in frozen_names:
                canonical_map[name] = name
                cluster_heads.append(name)
            else:
                canonical_map[name] = best_head
                if score < 100:
                    fuzzy_pairs.append((name, best_head, score))
        else:
            # Pas de cluster proche → nouveau cluster
            cluster_heads.append(name)
            canonical_map[name] = name

    # Log les fusions fuzzy pour revue
    if fuzzy_pairs:
        logger.info(
            f"[InsuredNameService] {len(fuzzy_pairs)} fusion(s) fuzzy "
            f"(seuil={FUZZY_THRESHOLD}%, len≥{MIN_FUZZY_LEN}, ratio≤{MAX_LEN_RATIO}) :"
        )
        for src, dst, score in sorted(fuzzy_pairs, key=lambda x: -x[2]):
            logger.info(f"  [{score:.1f}%]  '{src}'  →  '{dst}'")

    return canonical_map


# ── API publique ──────────────────────────────────────────────────────────────

def normalize_insured_names(df: pd.DataFrame) -> pd.DataFrame:
    """
    Ajoute la colonne INSURED_NAME_NORM au DataFrame.

    Étapes :
      1. Passe 1 regex : _clean_one() sur chaque valeur unique
      2. Passe 2 fuzzy : _build_canonical_map() sur les noms nettoyés uniques
      3. Mappe la colonne complète

    La colonne INSURED_NAME originale est PRÉSERVÉE.
    """
    if INSURED_COL not in df.columns:
        logger.warning(
            f"[InsuredNameService] Colonne '{INSURED_COL}' introuvable — "
            f"INSURED_NAME_NORM non créée."
        )
        return df

    import time
    t0 = time.perf_counter()

    raw_series = df[INSURED_COL].fillna("").astype(str)
    unique_raw = raw_series.unique().tolist()
    before_count = len([u for u in unique_raw if u.strip()])

    # ── Passe 1 : nettoyage regex ─────────────────────────────────────────
    cleaned_lookup: dict[str, str] = {}
    for name in unique_raw:
        cleaned_lookup[name] = _clean_one(name)

    unique_cleaned = list(set(v for v in cleaned_lookup.values() if v.strip()))
    after_regex_count = len(unique_cleaned)

    # ── Passe 2 : fuzzy grouping (avec protection Passe 0) ────────────────
    # Les canoniques Passe 0 présents dans les données sont "frozen" :
    # ils ne peuvent pas être fusionnés entre eux par le fuzzy.
    frozen_in_data = _PASSE0_CANONICALS & set(unique_cleaned)
    canonical_map = _build_canonical_map(unique_cleaned, frozen_names=frozen_in_data)

    # ── Combinaison : raw → cleaned → canonical ───────────────────────────
    final_lookup: dict[str, str] = {}
    for raw_name, cleaned_name in cleaned_lookup.items():
        canonical = canonical_map.get(cleaned_name, cleaned_name)
        final_lookup[raw_name] = canonical if canonical.strip() else raw_name.strip().upper()

    df[NORM_COL] = raw_series.map(lambda v: final_lookup.get(v, v))

    after_count = df[NORM_COL].nunique()
    elapsed = time.perf_counter() - t0

    logger.info(
        f"[InsuredNameService] Normalisation terminée en {elapsed:.2f}s — "
        f"{before_count} valeurs brutes → {after_regex_count} après regex → "
        f"{after_count} assurés distincts (fuzzy {FUZZY_THRESHOLD}%)"
    )

    return df


def get_insured_name_options(df: pd.DataFrame) -> list[str]:
    """
    Retourne les noms d'assurés normalisés uniques, triés alphabétiquement.
    Utilisé par get_filter_options() dans data_service.py.
    """
    if NORM_COL not in df.columns:
        if INSURED_COL in df.columns:
            return sorted([
                v for v in df[INSURED_COL].dropna().unique().tolist()
                if str(v).strip()
            ])
        return []

    return sorted([
        v for v in df[NORM_COL].dropna().unique().tolist()
        if str(v).strip()
    ])
