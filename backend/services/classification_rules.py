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
VIE_LABEL    = "VIE"
NON_VIE_LABEL = "NON_VIE"


def classify_lob(lob: str) -> str:
    """
    Classifie une ligne de branche comme VIE ou NON_VIE.
    Par défaut, toute branche inconnue est classée NON_VIE.
    """
    if not isinstance(lob, str):
        return NON_VIE_LABEL

    val = lob.lower().strip()

    # La branche contient « non » ET « vie » → NON_VIE (ex : « Non-Vie »)
    if "non" in val and "vie" in val:
        return NON_VIE_LABEL

    return VIE_LABEL if "vie" in val else NON_VIE_LABEL
