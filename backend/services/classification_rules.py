"""
classification_rules.py — Règles de classification métier
=========================================================
Ce module centralise les règles de classification qui étaient auparavant
dispersées sous forme de « magic strings » dans data_service.py.

Avantages :
  - Modification en un seul endroit sans toucher à la logique de chargement des données
  - Testabilité indépendante des règles métiers
  - Lisibilité accrue pour les équipes métier
"""

# ─── Cedante classification ───────────────────────────────────────────────────
CEDANTE_REASSUREUR     = "REASSUREUR"
CEDANTE_ASSUREUR_DIRECT = "ASSUREUR DIRECT"

# Mots-clés qui signalent un réassureur dans le nom de la cédante.
# La logique de détection reflète la formule Excel originale.
REASSUREUR_KEYWORDS: list[str] = [
    " reinsurance",
    " reins",
    " réassurance",
    " reassurance",
]

# Suffixes indiquant un réassureur (le nom se termine par ces chaînes précédées d'un espace)
REASSUREUR_SUFFIXES: list[str] = [" re", " ré"]


def classify_cedante(name: str) -> str:
    """
    Classifie une cédante comme REASSUREUR ou ASSUREUR DIRECT, d'après son nom.

    Réplique fidèle de la formule Excel :
      =SI(OU(
        DROITE(" "&MINUSCULE(SUPPRESPACE(L2))," re" ou " ré")
        CHERCHE(" reinsurance"|" reins"|" réassurance" dans " "&MINUSCULE(SUPPRESPACE(L2)))
      ) → "REASSUREUR" ; sinon "ASSUREUR DIRECT"
    """
    if not isinstance(name, str) or not name.strip():
        return CEDANTE_ASSUREUR_DIRECT

    normalized = " " + name.strip().lower()  # préfixe espace (comme Excel =" "&MINUSCULE(...))

    for suffix in REASSUREUR_SUFFIXES:
        if normalized.endswith(suffix):
            return CEDANTE_REASSUREUR

    for keyword in REASSUREUR_KEYWORDS:
        if keyword in normalized:
            return CEDANTE_REASSUREUR

    return CEDANTE_ASSUREUR_DIRECT


# ─── Vie / Non-vie classification ─────────────────────────────────────────────
import re

VIE_LABEL    = "VIE"
NON_VIE_LABEL = "NON_VIE"


def _normalize_for_vie_check(text: str) -> str:
    """
    Normalise une chaîne pour la détection Vie/Non-Vie.
    Supprime TOUS les espaces internes pour gérer les erreurs de saisie
    comme « V I E » ou « N o n - V i e ».
    """
    return re.sub(r"\s+", "", text.lower().strip())


def classify_lob(lob: str) -> str:
    """
    Classifie une ligne de branche comme VIE ou NON_VIE.
    Gère les espaces parasites : « V I E » → détecté comme VIE.
    Par défaut, toute branche inconnue est classée NON_VIE.
    """
    if not isinstance(lob, str):
        return NON_VIE_LABEL

    val = _normalize_for_vie_check(lob)

    # La branche contient « non » ET « vie » → NON_VIE (ex : « Non-Vie », « N o n - V i e »)
    if "non" in val and "vie" in val:
        return NON_VIE_LABEL

    return VIE_LABEL if "vie" in val else NON_VIE_LABEL


def classify_lob_with_spc(branche: str, int_spc: str) -> str:
    """
    Classification Vie/Non-Vie combinant INT_BRANCHE et INT_SPC.
    
    Logique OR : si l'une des deux sources indique VIE, le contrat
    est classifié VIE (sauf indication explicite NON_VIE).
    
    INT_SPC a le format « AE-FAC-VIE CONVENTIONNEL » où le 3ème
    segment (spécialité) peut contenir le mot VIE.
    
    Exemples:
      branche="TRANSPORT", int_spc="AE-FAC-VIE CONVENTIONNEL" → VIE
      branche="V I E",     int_spc="AM-TTY-AUTOMOBILE"         → VIE
      branche="INCENDIE",  int_spc="AE-FAC-RC GENERALE"        → NON_VIE
      branche="VIE",       int_spc=""                           → VIE
    """
    # 1. Vérifier INT_BRANCHE
    branche_result = classify_lob(branche)
    if branche_result == VIE_LABEL:
        return VIE_LABEL

    # 2. Vérifier INT_SPC (3ème segment = spécialité)
    if isinstance(int_spc, str) and int_spc.strip():
        parts = int_spc.split("-", 2)
        if len(parts) >= 3:
            spec = _normalize_for_vie_check(parts[2])
            # "NON VIE" ou "NONVIE" dans la spécialité → NON_VIE
            if "non" in spec and "vie" in spec:
                return NON_VIE_LABEL
            # "VIE" dans la spécialité → VIE
            if "vie" in spec:
                return VIE_LABEL

    return branche_result
