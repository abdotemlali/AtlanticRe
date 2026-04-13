"""
Algorithme intelligent de matching des noms de brokers — v2

Gère : fautes de frappe · abréviations · variantes linguistiques ·
       noms partiels · désordre des mots · saisie manuelle approximative

Dépendances :
    pip install rapidfuzz jellyfish scikit-learn pandas
"""

import re
import unicodedata
from typing import Optional

import numpy as np
import pandas as pd
import jellyfish
from rapidfuzz import fuzz, process as fuzz_process
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


# ══════════════════════════════════════════════════════════════════
#   TABLE DE VÉRITÉ  (alias → Broker_Canonique)
# ══════════════════════════════════════════════════════════════════

MAPPING: dict[str, str] = {
    # AON
    "aon": "Aon Re",
    "aon re": "Aon Re",
    "aon group": "Aon Re",
    "aon benfield": "Aon Re",
    "benfield": "Aon Re",
    "aon re africa": "Aon Re",
    "aon benfield middle east": "Aon Re",
    "aon arabia": "Aon Re",
    "aon france": "Aon Re",
    "aon belgium": "Aon Re",
    "aon portugal": "Aon Re",
    "aon re turkey": "Aon Re",
    "aon re iberia": "Aon Re",
    "aon re middle east": "Aon Re",
    "aon benfield china": "Aon Re",
    "aon benfield paris": "Aon Re",
    "aon socargest": "Aon Re",
    "aon central eastern europe": "Aon Re",
    "aon reinsurance solutions": "Aon Re",
    "aon re europe": "Aon Re",

    # GUY CARPENTER
    "guy carpenter": "Guy Carpenter",
    "guy carpenter middle east": "Guy Carpenter",
    "guy carpenter company": "Guy Carpenter",
    "guy carpenter turkey": "Guy Carpenter",
    "guy carpenter singapore": "Guy Carpenter",
    "guy carpenter labuan": "Guy Carpenter",
    "carpenter bowring": "Guy Carpenter",

    # GALLAGHER RE / WILLIS
    "gallagher": "Gallagher Re",
    "gallagher re": "Gallagher Re",
    "gallagher re ltd": "Gallagher Re",
    "gallagher plumer": "Gallagher Re",
    "willis": "Gallagher Re",
    "willis re": "Gallagher Re",
    "willis towers": "Gallagher Re",
    "wtw": "Gallagher Re",
    "willis tower watson": "Gallagher Re",
    "willis towers watson": "Gallagher Re",
    "ex willis": "Gallagher Re",
    "gras savoye": "Gallagher Re",

    # ELLGEO
    "ellgeo": "Ellgeo",
    "ellgeo re": "Ellgeo",

    # LOCKTON
    "lockton": "Lockton Re",
    "lockton re": "Lockton Re",

    # CHEDID
    "chedid": "Chedid Re",
    "chedid re": "Chedid Re",
    "chedid associates": "Chedid Re",
    "chedid associate": "Chedid Re",
    "chedid reinsurance": "Chedid Re",

    # SWAN RE
    "swan re": "Swan Re",

    # NASCO
    "nasco": "Nasco Re",
    "nasco reinsurance": "Nasco Re",

    # UIB
    "uib": "UIB",
    "united": "UIB",

    # MARSH
    "marsh": "Marsh",
    "marsh reinsurance": "Marsh",
    "marsh mclennan": "Marsh",

    # JB BODA
    "jb boda": "JB Boda",
    "j b boda": "JB Boda",
    "mb boda": "JB Boda",
    "boda": "JB Boda",

    # KM DASTUR
    "km dastur": "KM Dastur",
    "k m dastur": "KM Dastur",
    "dastur": "KM Dastur",

    # HOWDEN
    "howden": "Howden",

    # FENCHURCH FARIS
    "fenchurch": "Fenchurch Faris",
    "fenchurch faris": "Fenchurch Faris",

    # PRICE FORBES
    "price forbes": "Price Forbes",
    "ardonagh": "Price Forbes",

    # TYSERS
    "tyser": "Tysers",
    "tysers": "Tysers",

    # AUTRES
    "mds re": "MDS Re",
    "shields re": "Shields Re",
    "shields reinsurance": "Shields Re",
    "link re": "Link Re",
    "link reasurans": "Link Re",
    "taiping reinsurance": "Taiping Reinsurance Brokers",
    "fair": "Fair Insurance & Reinsurance Brokers",
    "beacon": "Beacon Insurance Broker",
    "integra": "Integra Insurance Broker",
    "trust re": "Trust Reinsurance Broker",
    "scaintera": "Scaintera Brokers",
    "scainterra": "Scaintera Brokers",
    "alpha lloyds": "Alpha Lloyds",
    "dashwood": "Dashwood",
    "premium broking": "Premium Broking House",
    "protection": "Protection Insurance Services",
    "apex": "Apex Insurance",
    "kay": "Kay International",
    "jordans global": "Jordans Global",
    "adnic": "ADNIC Fronting",
    "verta": "Verta Insurance & Reinsurance Brokers",
    "vertex": "Verta Insurance & Reinsurance Brokers",
    "mercu": "Mercu Reinsurance Broker",
    "mercur": "Mercu Reinsurance Broker",
    "reinsurance solutions": "Reinsurance Solutions",
    "first reinsurance": "First Reinsurance Brokers",
    "modern reinsurance": "Modern Reinsurance Brokers",
    "platinum reinsurance": "Platinum Reinsurance Brokers",
    "platinium reinsurance": "Platinum Reinsurance Brokers",
    "minerva re": "Minerva Re",
    "ebony reinsurance": "Ebony Reinsurance Brokers",
    "kek reinsurance": "KEK Reinsurance Brokers",
    "origo": "Origo Reinsurance Broker",
    "broktech": "Broktech SAL",
    "atlas reinsurance": "Atlas Reinsurance Consultants",
    "aegis re": "Aegis Re",
    "believe reinsurance": "Believe For Reinsurance",
    "china zenith": "China Zenith Insurance Brokers",
    "srm": "SRM Specialised Risk Management",
    "afro asian": "Afro-Asian Insurance Services",
    "afroasian": "Afro-Asian Insurance Services",
    "afro asiatique": "Afro-Asian Insurance Services",
    "bharat re": "Bharat Re",
    "commercial general": "Commercial & General SAL",
    "prudent": "Prudent Insurance Brokers",
    "nelson re": "Nelson Re",
    "guardian reinsurance": "Guardian Reinsurance Brokers",
    "ata global": "ATA Global Sigorta",
    "cg re": "CG Re",
    "alternative millenium": "Alternative Millenium Reinsurance Broker",
    "alert": "Alert Insurance Brokers",
    "maksure": "Maksure Risk Solutions",
    "mak sure": "Maksure Risk Solutions",
    "west african": "West African Insurance & Reinsurance",
    "african reinsurance brokers": "African Reinsurance Brokers",
    "african reinsurance consultants": "African Reinsurance Consultants",
    "arc reinsurance": "African Reinsurance Consultants",
    "fremir": "Fremir Insurance & Reinsurance Services",
    "alliance": "Alliance Insurance Brokers",
    "reinsurance brokerage": "Reinsurance Brokerage Solutions",
    "mukoma": "Mukoma Financial Services",
    "pioneer": "Pioneer Insurance & Reinsurance Broker",
    "emergen": "Emergen Global",
    "tata motors": "Tata Motors Insurance Broking Services",
    "ars tunisie": "ARS Tunisie",
    "dach re": "DACH-Re Insurance & Reinsurance Brokers",
    "prevensure": "Prevensure Insurance Broker",
    "mathrawala": "Mathrawala & Sons Brokers",
    "salasar": "Salasar Services Insurance Brokers",
    "filhet allard": "Filhet-Allard Maritime Courtiers d'Assurances",
    "zep re": "ZEP-Re / BK Fronting",
    "ace": "ACE Insurance Brokers",
    "malakut": "Malakut Insurance Broker",
    "worldwide re": "Worldwide Re",
    "exos": "Exos Corporation",
    "mnk re": "MNK Re",
    "india insure": "India Insure Risk Management",
    "miller": "Miller Insurance",
    "ed broking": "ED Broking",
    "jlt": "JLT",
    "rfib": "RFIB",
    "siaci": "Siaci Saint Honore",
    "edelweiss gallagher": "Edelweiss Gallagher",
    "ascoma": "Ascoma International",
    "piiq": "PIIQ Risk Partners",
    "bms": "BMS Group",
    "oneglobal": "OneGlobal Broking",
    "one global": "OneGlobal Broking",
    "besso re": "Besso Re",
    "ec3": "EC3 Brokers",
    "thb": "THB Group",
    "cooper gay": "Cooper Gay",
    "math re": "Math Re",
}

# ══════════════════════════════════════════════════════════════════
#   STOP WORDS  (juridiques + secteur + géographie EN + FR)
# ══════════════════════════════════════════════════════════════════

STOP_WORDS = frozenset({
    "ltd", "llc", "plc", "inc", "srl", "sa", "sas", "bv", "pte", "pvt",
    "co", "corp", "pty", "lic", "limited", "company", "private",
    "ste", "sal", "wll", "ssa", "pltd", "oy",
    "and", "the", "of", "for", "ex", "de", "du", "ve", "et",
    "insurance", "reinsurance", "brokers", "broking", "broker",
    "brokerage", "services", "solutions", "management", "risk",
    "group", "re", "holdings", "consulting", "consultants",
    "international", "global", "associates", "associate",
    "africa", "asia", "europe", "middle", "east", "difc", "branch",
    "turkey", "egypt", "india", "singapore", "dubai", "saudi",
    "qatar", "liban", "france", "paris", "spain", "iberia", "uk",
    "tunisie", "egypte", "maroc", "turquie", "emirats", "arabie",
    "china", "malaysia", "labuan", "mauritius",
    "maritime", "courtiers", "assurances", "reasurans", "sigorta",
    "brokerligi", "reassurance",
})

# Acronymes à développer avant normalisation
ACRONYMS = {
    "wtw":  "willis towers watson",
    "uib":  "united insurance brokers",
    "jlt":  "jardine lloyd thompson",
    "gc":   "guy carpenter",
    "rfib": "rfib",
    "thb":  "thb",
    "bms":  "bms",
}


# ══════════════════════════════════════════════════════════════════
#   FONCTIONS DE NORMALISATION
# ══════════════════════════════════════════════════════════════════

def remove_accents(text: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    )


def normalize(text: str) -> str:
    if not isinstance(text, str) or not text.strip():
        return ""
    t = remove_accents(text.lower())
    t = re.sub(r"[&.,()\/\-_'\"\+\*@#!;:]", " ", t)
    t = re.sub(r"\b(" + "|".join(re.escape(w) for w in STOP_WORDS) + r")\b", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def preprocess(raw: str) -> str:
    t = raw.strip()
    t = ACRONYMS.get(t.lower(), t)
    return normalize(t)


# ══════════════════════════════════════════════════════════════════
#   CLASSE PRINCIPALE
# ══════════════════════════════════════════════════════════════════

class SmartBrokerMatcher:
    """
    5 couches de matching combinées avec vote pondéré :

    1. Exact normalisé         score 1.00  — après suppression des stop words
    2. Fuzzy token_set_ratio   poids 1.00  — désordre des mots, mots en plus
    3. Fuzzy partial_ratio     poids 0.88  — noms tronqués / sous-chaînes
    4. TF-IDF cosine (2-3g)    poids 0.82  — fautes de frappe caractère
    5. Phonétique Metaphone    poids 0.72  — fautes de prononciation

    Bonus de consensus +5% par couche supplémentaire convergente (max +15%).
    """

    def __init__(self, threshold: float = 0.45):
        self.threshold = threshold
        self._keys_raw   = list(MAPPING.keys())
        self._keys_norm  = [normalize(k) for k in self._keys_raw]
        self._canonicals = [MAPPING[k] for k in self._keys_raw]

        # TF-IDF bi/trigrammes de caractères
        self._vec   = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 3))
        self._tfidf = self._vec.fit_transform(self._keys_norm)

        # Index phonétique
        self._phon: dict[str, list[int]] = {}
        for i, kn in enumerate(self._keys_norm):
            for w in kn.split():
                if len(w) > 2:
                    self._phon.setdefault(jellyfish.metaphone(w), []).append(i)

    # ── couches ───────────────────────────────────────────────────

    def _fuzz_token(self, q):
        m = fuzz_process.extractOne(q, self._keys_norm,
                                    scorer=fuzz.token_set_ratio, score_cutoff=0)
        return (m[2], m[1] / 100.0) if m else (0, 0.0)

    def _fuzz_partial(self, q):
        filtered = [(i, kn) for i, kn in enumerate(self._keys_norm) if len(kn) >= 4]
        if not filtered:
            return 0, 0.0
        idxs, kns = zip(*filtered)
        m = fuzz_process.extractOne(q, kns, scorer=fuzz.partial_ratio, score_cutoff=0)
        if not m:
            return 0, 0.0
        _, score, local_idx = m
        return idxs[local_idx], score / 100.0

    def _score_tfidf(self, q):
        if not q:
            return 0, 0.0
        v    = self._vec.transform([q])
        sims = cosine_similarity(v, self._tfidf).flatten()
        idx  = int(np.argmax(sims))
        return idx, float(sims[idx])

    def _score_phon(self, q):
        words = [w for w in q.split() if len(w) > 2]
        if not words:
            return 0, 0.0
        votes: dict[int, int] = {}
        for w in words:
            for i in self._phon.get(jellyfish.metaphone(w), []):
                votes[i] = votes.get(i, 0) + 1
        if not votes:
            return 0, 0.0
        best = max(votes, key=votes.get)
        return best, min(votes[best] / len(words), 1.0)

    # ── match principal ───────────────────────────────────────────

    def match(self, raw: str) -> dict:
        """
        Trouve le broker canonique pour un nom brut.

        Retourne un dict :
          canonical   — nom canonique (ou "Non identifié")
          score       — confiance [0.0–1.0]
          confidence  — Exact | Élevé | Moyen | Faible | Aucun
          method      — couche principale utilisée
          input_norm  — forme normalisée (debug)
        """
        if not isinstance(raw, str) or not raw.strip():
            return self._no_match("", "")

        q = preprocess(raw)

        if not q:
            return self._no_match(raw, q)

        # Couche 1 : exact
        if q in self._keys_norm:
            return self._build(self._keys_norm.index(q), 1.0, "exact", q)

        # Couches 2-5
        layers = [
            (*self._fuzz_token(q),   1.00, "fuzzy_token_set"),
            (*self._fuzz_partial(q), 0.88, "fuzzy_partial"),
            (*self._score_tfidf(q),  0.82, "tfidf_cosine"),
            (*self._score_phon(q),   0.72, "phonetic"),
        ]

        # Vote pondéré avec bonus consensus
        pool: dict[int, list[tuple[float, str]]] = {}
        for idx, sc, w, method in layers:
            pool.setdefault(idx, []).append((sc * w, method))

        best_idx, best_score, best_method = 0, 0.0, "none"
        for idx, entries in pool.items():
            top       = max(e[0] for e in entries)
            consensus = min(0.05 * (len(entries) - 1), 0.15)
            combined  = min(top + consensus, 1.0)
            if combined > best_score:
                best_score  = combined
                best_idx    = idx
                best_method = max(entries, key=lambda e: e[0])[1]

        if best_score < self.threshold:
            return self._no_match(raw, q)

        return self._build(best_idx, best_score, best_method, q)

    # ── helpers ───────────────────────────────────────────────────

    def _build(self, idx, score, method, norm):
        score = round(min(score, 1.0), 3)
        conf  = ("Exact" if score == 1.0 else
                 "Élevé" if score >= 0.80 else
                 "Moyen" if score >= 0.60 else "Faible")
        return {"canonical": self._canonicals[idx], "score": score,
                "confidence": conf, "method": method, "input_norm": norm}

    def _no_match(self, raw, norm):
        return {"canonical": "Non identifié", "score": 0.0,
                "confidence": "Aucun", "method": "none", "input_norm": norm}

    # ── DataFrame ─────────────────────────────────────────────────

    def process_dataframe(self, df: pd.DataFrame,
                          column: str = "INT_BROKER",
                          keep_debug: bool = False) -> pd.DataFrame:
        res = df[column].apply(lambda x: self.match(str(x)))
        out = df.copy()
        out["BROKER_CANONICAL"] = res.apply(lambda r: r["canonical"])
        out["MATCH_SCORE"]      = res.apply(lambda r: r["score"])
        out["MATCH_CONFIDENCE"] = res.apply(lambda r: r["confidence"])
        if keep_debug:
            out["MATCH_METHOD"] = res.apply(lambda r: r["method"])
            out["INPUT_NORM"]   = res.apply(lambda r: r["input_norm"])
        return out

    def unmatched(self, df: pd.DataFrame,
                  col: str = "MATCH_CONFIDENCE") -> pd.DataFrame:
        return df[df[col].isin(["Aucun", "Faible"])].copy()


# ══════════════════════════════════════════════════════════════════
#   Singleton
# ══════════════════════════════════════════════════════════════════

_matcher_instance: Optional[SmartBrokerMatcher] = None


def get_broker_matcher() -> SmartBrokerMatcher:
    global _matcher_instance
    if _matcher_instance is None:
        _matcher_instance = SmartBrokerMatcher()
    return _matcher_instance
