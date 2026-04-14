"""
Algorithme intelligent de matching des noms de cédantes — v1

Gère : fautes de frappe · abréviations · variantes linguistiques ·
       noms partiels · désordre des mots · saisie manuelle approximative

Architecture identique à broker_matching_service.py (5 couches + vote pondéré).

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
#   TABLE DE VÉRITÉ  (alias → Cedante_Canonique)
# ══════════════════════════════════════════════════════════════════

CEDANTE_MAPPING: dict[str, str] = {

    # ══════════════════════════════════════════════════════════════
    # AFRICA RE
    # ══════════════════════════════════════════════════════════════
    "africa re": "Africa Re",
    "africa re casablanca": "Africa Re",
    "africa re bureau casablanca": "Africa Re",
    "africa re abidjan": "Africa Re",
    "africa retakaful": "Africa Re",
    "african reinsurance corporation": "Africa Re",
    "african reinsurance corp": "Africa Re",

    # ══════════════════════════════════════════════════════════════
    # SCR — Société Centrale de Réassurance (Maroc)
    # ══════════════════════════════════════════════════════════════
    "societe centrale de reassurance": "SCR",
    "compagnie centrale de reassurance": "SCR",
    "scr": "SCR",
    "scg re": "SCR",
    "asr scr cooperation": "SCR",
    "asr scr": "SCR",
    "al ain front scr": "SCR",
    "ccr maroc": "SCR",

    # ══════════════════════════════════════════════════════════════
    # CICA-RE
    # ══════════════════════════════════════════════════════════════
    "cica re": "CICA-Re",
    "cica - re": "CICA-Re",

    # ══════════════════════════════════════════════════════════════
    # ZEP-RE / PTA Re
    # ══════════════════════════════════════════════════════════════
    "zep re": "ZEP-Re",
    "pta reinsurance": "ZEP-Re",
    "pta reinsurance co": "ZEP-Re",
    "pta re": "ZEP-Re",
    "bk general insurance": "ZEP-Re",
    "bk fronting": "ZEP-Re",

    # ══════════════════════════════════════════════════════════════
    # WAICA Re
    # ══════════════════════════════════════════════════════════════
    "waica re": "WAICA Re",
    "waica reinsurance corporation": "WAICA Re",
    "waica reinsurance": "WAICA Re",

    # ══════════════════════════════════════════════════════════════
    # CONTINENTAL Re
    # ══════════════════════════════════════════════════════════════
    "continental reinsurance": "Continental Re",
    "continental reinsurance company": "Continental Re",
    "continental reinsurance company plc": "Continental Re",
    "continental reinsurance ltd": "Continental Re",
    "continental reinsurance botswana": "Continental Re",
    "continental trust insurance": "Continental Re",
    "continental re": "Continental Re",
    "continental re front activa re": "Continental Re",

    # ══════════════════════════════════════════════════════════════
    # EMERITUS Re
    # ══════════════════════════════════════════════════════════════
    "emeritus reinsurance": "Emeritus Re",
    "emeritus international reinsurance": "Emeritus Re",
    "emeritus reinsurance zambia": "Emeritus Re",
    "emeritus reinsurance mozambique": "Emeritus Re",
    "emeritus re": "Emeritus Re",

    # ══════════════════════════════════════════════════════════════
    # ARAB Re
    # ══════════════════════════════════════════════════════════════
    "arab reinsurance company": "Arab Re",
    "arab re": "Arab Re",
    "arab reinsurance": "Arab Re",

    # ══════════════════════════════════════════════════════════════
    # SAUDI Re
    # ══════════════════════════════════════════════════════════════
    "saudi re": "Saudi Re",
    "saudi reinsurance": "Saudi Re",

    # ══════════════════════════════════════════════════════════════
    # OMAN Re
    # ══════════════════════════════════════════════════════════════
    "oman reinsurance company": "Oman Re",
    "oman reinsurance": "Oman Re",
    "oman re": "Oman Re",

    # ══════════════════════════════════════════════════════════════
    # KUWAIT Re
    # ══════════════════════════════════════════════════════════════
    "kuwait reinsurance company": "Kuwait Re",
    "kuwait reinsurance": "Kuwait Re",
    "kuwait re": "Kuwait Re",

    # ══════════════════════════════════════════════════════════════
    # GHANA Re
    # ══════════════════════════════════════════════════════════════
    "ghana reinsurance company": "Ghana Re",
    "ghana reinsurance": "Ghana Re",
    "ghana re": "Ghana Re",
    "ghana reinsurance co kenya": "Ghana Re",
    "ghana reinsurance kenya": "Ghana Re",

    # ══════════════════════════════════════════════════════════════
    # KENYA Re
    # ══════════════════════════════════════════════════════════════
    "kenya re corporation": "Kenya Re",
    "kenya re": "Kenya Re",
    "kenya reinsurance": "Kenya Re",

    # ══════════════════════════════════════════════════════════════
    # NIGERIA Re
    # ══════════════════════════════════════════════════════════════
    "nigeria reinsurance": "Nigeria Re",
    "nigeria reinsurance plc": "Nigeria Re",
    "nigerian reinsurance": "Nigeria Re",

    # ══════════════════════════════════════════════════════════════
    # UGANDA Re
    # ══════════════════════════════════════════════════════════════
    "uganda re": "Uganda Re",
    "uganda reinsurance": "Uganda Re",

    # ══════════════════════════════════════════════════════════════
    # MALAWI Re
    # ══════════════════════════════════════════════════════════════
    "malawi re": "Malawi Re",
    "malawi reinsurance": "Malawi Re",

    # ══════════════════════════════════════════════════════════════
    # ZAMBIA Re
    # ══════════════════════════════════════════════════════════════
    "zambia reinsurance": "Zambia Re",
    "zambia reinsurance company": "Zambia Re",

    # ══════════════════════════════════════════════════════════════
    # FBC Re (Zimbabwe)
    # ══════════════════════════════════════════════════════════════
    "fbc reinsurance": "FBC Re",
    "fbc re": "FBC Re",

    # ══════════════════════════════════════════════════════════════
    # FBS Re
    # ══════════════════════════════════════════════════════════════
    "fbs reinsurance": "FBS Re",
    "fbs reinsurance limited": "FBS Re",
    "fbs re": "FBS Re",

    # ══════════════════════════════════════════════════════════════
    # HOLLANDIA Re
    # ══════════════════════════════════════════════════════════════
    "hollandia reinsurance": "Hollandia Re",
    "hollandia reinsurance company": "Hollandia Re",

    # ══════════════════════════════════════════════════════════════
    # MAURITIUS Re
    # ══════════════════════════════════════════════════════════════
    "reinsurance company of mauritius": "Mauritius Re",
    "mauritius reinsurance": "Mauritius Re",
    "reins co of mauritius": "Mauritius Re",

    # ══════════════════════════════════════════════════════════════
    # TUNISIE / STAR — Cédantes tunisiennes
    # ══════════════════════════════════════════════════════════════
    "societe tunisienne de reassurance": "Tunis Re",
    "tunis reinsurance company": "Tunis Re",
    "tunis re": "Tunis Re",
    "star": "STAR Assurances",
    "star nationale tchad": "STAR Assurances Tchad",
    "societe tunisienne assurances reassurances": "STAR Assurances",
    "societe tunisienne d assurances reassurances": "STAR Assurances",
    "comar": "COMAR Assurances",
    "comar assurances": "COMAR Assurances",
    "assurances biat": "Assurances BIAT",
    "groupe des assurances de tunisie": "GAT Assurances",
    "astree": "Astree Assurances",
    "zitouna takaful": "Zitouna Takaful",
    "attijari assurance": "Attijari Assurance",
    "carte assurances": "Carte Assurances",
    "lloyd tunisien": "Lloyd Tunisien",
    "caisse tunisienne assurance mutuelles": "CTAM",
    "generale assurances tunisie": "GAT Assurances",

    # ══════════════════════════════════════════════════════════════
    # MAROC — Cédantes marocaines
    # ══════════════════════════════════════════════════════════════
    "wafa assurance": "Wafa Assurance",
    "wafa assurances": "Wafa Assurance",
    "wafa assurance vie": "Wafa Assurance Vie",
    "wafa cession afrique": "Wafa Assurance",
    "wafa assurance senegal": "Wafa Assurance Sénégal",
    "rma watanya": "RMA Watanya",
    "rma cession afrique": "RMA Watanya",
    "atlantasanad": "AtlantaSanad",
    "atlanta assurances": "AtlantaSanad",
    "ex atlanta": "AtlantaSanad",
    "ex sanad": "AtlantaSanad",
    "axa assurance maroc": "AXA Assurance Maroc",
    "allianz assurances maroc": "Allianz Assurances Maroc",
    "allianz maroc": "Allianz Assurances Maroc",
    "zurich maroc": "Allianz Assurances Maroc",
    "mutuelle centrale marocaine": "MCMA",
    "mutuelle centrale marocaine assurances": "MCMA",
    "mcma": "MCMA",
    "mamda re": "MAMDA Re",
    "mutuelle agricole marocaine": "MAMDA",
    "mutuelle agricole marocaine assurances": "MAMDA",
    "saham assurance maroc": "Saham Assurance",
    "saham assurance": "Saham Assurance",
    "saham re": "Saham Re",
    "saham re togo": "Saham Re",
    "saham assurance burkina faso": "Saham Assurance Burkina Faso",
    "cnia assurance": "CNIA Assurance",
    "euler hermes acmar": "Euler Hermes / ACMAR",
    "acmar": "Euler Hermes / ACMAR",
    "ste marocaine assurance exportation": "SMAEX",
    "smaex": "SMAEX",
    "la marocaine vie": "La Marocaine Vie",

    # ══════════════════════════════════════════════════════════════
    # ALGÉRIE — Cédantes algériennes
    # ══════════════════════════════════════════════════════════════
    "compagnie centrale de reassurance algerie": "CCR Algérie",
    "ccr algerie": "CCR Algérie",
    "cash algerie": "CASH Algérie",
    "alliance assurances": "Alliance Assurances Algérie",
    "societe nationale assurance": "SAA Algérie",
    "compagnie algerienne assurances transport": "CAAT",
    "cat": "CAAT",
    "compagnie algerienne assurances reassurances": "CAAR",
    "trust algeria": "Trust Algeria",
    "gig algeria": "GIG",

    # ══════════════════════════════════════════════════════════════
    # SÉNÉGAL & AFRIQUE SUBSAHARIENNE FRANCOPHONE
    # ══════════════════════════════════════════════════════════════
    "societe senegalaise de reassurances": "SEN Re",
    "sen re": "SEN Re",
    "nsia assurance": "NSIA",
    "nsia assurances": "NSIA",
    "nsia congo": "NSIA",
    "nsia gabon": "NSIA",
    "nsia togo": "NSIA",
    "nsia cameroun": "NSIA",
    "nsia senegal": "NSIA",
    "nsia participations": "NSIA",
    "sunu assurances": "SUNU Assurances",
    "sunu assurances iardt": "SUNU Assurances",
    "sunu assurance iard niger": "SUNU Assurances",
    "sunu participation holding": "SUNU Assurances",
    "colina re": "Colina Re",
    "colina senegal": "Colina",
    "colina mali": "Colina",
    "colina burkina faso": "Colina Burkina Faso",
    "colina cameroun": "Colina",
    "colina guinee conakry": "Colina Guinée",
    "groupe colina": "Colina",
    "atlantique assurances cote ivoire": "Atlantique Assurances Côte d'Ivoire",
    "atlantique assurances mali": "Atlantique Assurances",
    "atlantique assurances cameroun": "Atlantique Assurances",
    "atlantique assurances benin": "Atlantique Assurances Bénin",
    "atlantique assurance vie": "Atlantique Assurance Vie",
    "activa assurances": "Activa Assurances",
    "askia assurances": "Askia Assurances",
    "coris assurances": "Coris Assurances",
    "sonas": "SONAS",
    "sonarwa": "SONARWA",
    "sonar burkina": "SONAR",
    "nouvelle compagnie africaine reassurance": "NCAR",
    "ncar": "NCAR",
    "pool ipa assistance cedantes africaines": "Pool IPA",
    "prestige assurance": "Prestige Assurance",
    "equity assurance": "Equity Assurance",
    "star assurance": "Star Assurance",
    "aveni re": "Aveni Re",
    "tropical reinsurance": "Tropical Re",
    "assurances senegalaise": "AMSA Assurances",
    "amsa assurances": "AMSA Assurances",
    "finafrica assurances senegal": "Finafrica Assurances",
    "axa assurance senegal": "AXA Assurance Sénégal",
    "allianz senegal": "Allianz Sénégal",
    "allianz cote ivoire": "Allianz Côte d'Ivoire",
    "axa assurance cote ivoire": "AXA Assurance Côte d'Ivoire",
    "axa assurances cameroun": "AXA Assurances",
    "axa assurances gabon": "AXA Assurances",
    "axa cessions afrique": "AXA Cessions Afrique",
    "axa global life": "AXA Global Life",
    "axa global pc": "AXA Global P&C",
    "africain des assurances cote ivoire": "L'Africain des Assurances",
    "lafricain des assurances": "L'Africain des Assurances",
    "africain des assurances congo": "L'Africain des Assurances",
    "assurances generales mauritanie": "AGM",
    "mauritanienne assurances": "Mauritanienne d'Assurances",
    "assurances reassurances africaines cameroun": "ARA",
    "chanas assurances": "Chanas Assurances",
    "societe camerounaise assurances": "SCA",
    "sanlam assurance cameroon": "Sanlam Assurance Cameroun",
    "sanlam assurance benin": "Sanlam Assurance Bénin",
    "generales assurances cameroun": "Générales Assurances Cameroun",
    "icea lion general insurance": "ICEA Lion",
    "icea lion tanzania": "ICEA Lion",
    "britam insurance uganda": "Britam",
    "britam rwanda": "Britam",
    "jackson assurance": "Jackson Assurance",
    "zenithe assurances": "Zenithe Assurances",
    "pro assur": "Pro Assur",
    "taamin assurances": "Taamin Assurances",
    "generation nouvelle assurances": "Génération Nouvelle d'Assurances",
    "confidence insurance": "Confidence Insurance",
    "la federale assurances": "La Fédérale d'Assurances",
    "union assurances burkina": "UAB",
    "uab vie": "UAB Vie",
    "cif assurances burkina": "CIF Assurances",
    "cif assurance mali": "CIF Assurance Mali",
    "colina iard": "Colina IARD",
    "industrial general insurance": "IGI",
    "great nigeria insurance": "Great Nigeria Insurance",
    "nigeria general insurance": "Nigeria General Insurance",
    "sterling assurances nigeria": "Sterling Assurances",
    "mutual benefits assurance": "Mutual Benefits Assurance",
    "african prudential insurance": "African Prudential Insurance",
    "prima reinsurance": "Prima Re",
    "la nigerienne assurance": "La Nigérienne d'Assurance",
    "nigerienne assurance reassurance": "La Nigérienne d'Assurance",
    "ogar": "OGAR",
    "askia": "Askia Assurances",
    "gta assurance": "GTA Assurance",
    "alliance africaine assurance": "Alliance Africaine d'Assurance",
    "mainstream reinsurance": "Mainstream Re",
    "radiant insurance": "Radiant Insurance",
    "east africa reinsurance": "East Africa Re",
    "east africa general insurance": "East Africa General Insurance",
    "assurances reassurances congo": "ARC Congo",

    # ══════════════════════════════════════════════════════════════
    # AFRIQUE DE L'EST & AUSTRALE (anglophone)
    # ══════════════════════════════════════════════════════════════
    "jubilee insurance": "Jubilee Insurance",
    "jubilee general insurance": "Jubilee Insurance",
    "jubilee insurance mauritius": "Jubilee Insurance",
    "jubilee insurance uganda": "Jubilee Insurance",
    "jubilee insurance kenya": "Jubilee Insurance",
    "jubilee insurance tanzania": "Jubilee Insurance",
    "mayfair insurance": "Mayfair Insurance",
    "mayfair insurance zambia": "Mayfair Insurance",
    "mayfair insurance rwanda": "Mayfair Insurance",
    "mayfair insurance tanzania": "Mayfair Insurance",
    "kenya orient insurance": "Kenya Orient Insurance",
    "kenyan alliance": "Kenyan Alliance",
    "kenya national assurance": "Kenya National Assurance",
    "apa insurance": "APA Insurance",
    "cannon assurances kenya": "Cannon Assurances Kenya",
    "kenindia": "Kenindia Assurance",
    "enterprise insurance": "Enterprise Insurance",
    "uap old mutual": "UAP Old Mutual",
    "britam": "Britam",
    "ga insurance": "GA Insurance",
    "ga insurance tanzania": "GA Insurance",
    "madison general insurance zambia": "Madison General Insurance",
    "nico insurance zambia": "NICO Insurance Zambia",
    "zambia state insurance": "Zambia State Insurance",
    "professional insurance zambia": "Professional Insurance Zambia",
    "hollard insurance zambia": "Hollard Insurance Zambia",
    "zanzibar insurance": "Zanzibar Insurance",
    "eagle insurance": "Eagle Insurance",
    "nile insurance": "Nile Insurance",
    "nyala insurance": "Nyala Insurance",
    "awash insurance": "Awash Insurance",
    "ethiopian insurance corporation": "Ethiopian Insurance Corporation",
    "ethiopian re": "Ethiopian Re",
    "vision insurance": "Vision Insurance",
    "national insurance corporation uganda": "NIC Uganda",
    "sanlam general insurance": "Sanlam General Insurance",
    "mayfair": "Mayfair Insurance",
    "phoenix tanzania": "Phoenix of Tanzania",
    "reliance insurance tanzania": "Reliance Insurance Tanzania",
    "tanzindia assurance": "Tanzindia Assurance",
    "mua insurance rwanda": "MUA Insurance Rwanda",
    "swan general": "Swan General",
    "mauritius union": "Mauritius Union",
    "beneficial general insurance": "Beneficial General Insurance",
    "beneficial life insurance": "Beneficial Life Insurance",
    "national insurance trust fund": "NITF",
    "sicom": "SICOM",
    "la prudence mauricienne": "La Prudence Mauricienne",
    "mayfair insurance co": "Mayfair Insurance",
    "botswana insurance company": "Botswana Insurance Company",
    "lesotho national insurance": "Lesotho National Insurance",

    # ══════════════════════════════════════════════════════════════
    # MOYEN-ORIENT — UAE / QATAR / BAHRAIN / OMAN / KUWAIT
    # ══════════════════════════════════════════════════════════════
    "abu dhabi national insurance": "ADNIC",
    "adnic": "ADNIC",
    "abu dhabi national takaful": "Abu Dhabi National Takaful",
    "abu dhabi re": "Abu Dhabi Re",
    "al dhafra insurance": "Al Dhafra Insurance",
    "orient insurance pjsc": "Orient Insurance",
    "orient insurance": "Orient Insurance",
    "orient sigorta": "Orient Insurance",
    "orient takaful": "Orient Takaful",
    "orient unb takaful": "Orient UNB Takaful",
    "sukoon": "Sukoon Insurance",
    "sukoon insurance": "Sukoon Insurance",
    "oman insurance company": "Sukoon Insurance",
    "oman insurance psc": "Sukoon Insurance",
    "oman insurance": "Sukoon Insurance",
    "dubai insurance company": "Dubai Insurance",
    "dubai national insurance": "Dubai National Insurance",
    "dubai islamic insurance": "AMAN Dubai (DIIB)",
    "union insurance ajman": "Union Insurance",
    "al fujairah national insurance": "Al Fujairah National Insurance",
    "ras al khaimah national insurance": "RAK National Insurance",
    "rak national insurance": "RAK National Insurance",
    "emirates insurance company": "Emirates Insurance",
    "insurance house": "Insurance House",
    "al ain ahlia insurance": "Al Ain Ahlia",
    "national general insurance": "NGI",
    "al wathba national insurance": "Al Wathba National Insurance",
    "fidelity united insurance": "Fidelity United Insurance",
    "al khazna insurance": "Al Khazna Insurance",
    "seib insurance": "SEIB Insurance",
    "seib insurance and reinsurance": "SEIB Insurance",
    "dar takaful": "Dar Takaful",
    "methaq takaful": "Methaq Takaful",
    "yas takaful": "YAS Takaful",
    "noor takaful": "Noor Takaful",
    "enaya insurance": "Enaya Insurance",
    "al madina gulf insurance": "Al Madina Insurance",
    "al madina takaful": "Al Madina Takaful",
    "islamic arab insurance salama": "SALAMA (IAIC)",
    "salama insurance": "SALAMA",
    "salama assurances": "SALAMA",
    "salama takaful": "SALAMA Takaful",
    "aman takaful": "Aman Takaful",
    "amana insurance": "Amana Insurance",
    "amana gulf insurance": "Amana Gulf Insurance",
    "amana cooperative insurance": "Amana Cooperative Insurance",
    "yap takaful": "YAS Takaful",
    "takaful emarat": "Takaful Emarat",
    "al buhaira national insurance": "Al Buhaira National Insurance",
    "sharjah insurance": "Sharjah Insurance",
    "gulf insurance group": "GIG",
    "gig": "GIG",
    "gulf insurance group jordan": "GIG",
    "gulf insurance group bahrain": "GIG",
    "gulf insurance group iraq": "GIG",
    "gulf takaful insurance": "Gulf Takaful",
    "gulf general cooperative": "Gulf General Cooperative Insurance",
    "gulf union insurance": "Gulf Union",
    "gulf international reinsurance": "Gulf International Re",
    "oman qatar insurance": "Oman Qatar Insurance",
    "oman united insurance": "Oman United Insurance",
    "qatar insurance company": "Qatar Insurance Company (QIC)",
    "qic": "Qatar Insurance Company (QIC)",
    "qatar general insurance": "Qatar General Insurance",
    "qatar islamic insurance": "Qatar Islamic Insurance",
    "doha insurance": "Doha Insurance",
    "doha bank assurance": "Doha Bank Assurance",
    "doha takaful": "Doha Takaful",
    "q re": "Q-Re",
    "bahrain national insurance": "Bahrain National Insurance",
    "bahrain insurance company": "Bahrain Insurance Company",
    "bahrain islamic insurance": "Bahrain Islamic Insurance",
    "tazur": "T'azur",
    "tazur takaful": "T'azur",
    "t azur takaful insurance": "T'azur",
    "arab insurance group bsc": "ARIG",
    "arig": "ARIG",
    "kuwait insurance company": "Kuwait Insurance",
    "kuwait islamic takaful": "Kuwait Islamic Takaful",
    "kuwait international takaful": "Kuwait International Takaful",
    "boubyan takaful": "Boubyan Takaful",
    "kfh takaful": "KFH Takaful",
    "warba insurance": "Warba Insurance",
    "ritaj takaful": "Ritaj Takaful",
    "kib takaful": "KIB Takaful",
    "al koot insurance": "Al Koot Insurance",
    "burgan insurance": "Burgan Insurance",
    "burgan takaful": "Burgan Takaful",
    "al hamraa insurance iraq": "Al Hamraa Insurance",
    "united cooperative assurance": "UCA",
    "national takaful company watania": "Watania",
    "watania": "Watania",
    "wataniya insurance": "Wataniya Insurance",
    "al wataniya insurance": "Wataniya Insurance",
    "national takaful insurance": "National Takaful",
    "iskan insurance": "Iskan Insurance",
    "weqaya insurance": "Weqaya Insurance",
    "solidarity insurance": "Solidarity Insurance",
    "solidarity first insurance": "Solidarity First Insurance",
    "solidarity saudi takaful": "Solidarity Saudi Takaful",
    "muscat insurance": "Muscat Insurance",
    "takaful oman insurance": "Takaful Oman",
    "co operative insurance society": "COOP Insurance",
    "the company for cooperative insurance": "Tawuniya",
    "tawuniya": "Tawuniya",
    "damaan islamic insurance beema": "Beema",
    "beema": "Beema",
    "al sagr national insurance": "Al Sagr National Insurance",
    "al sagr saudi insurance": "Al Sagr Saudi Insurance",
    "liva insurance": "LIVA Insurance",
    "liva insurance saoc": "LIVA Insurance",
    "inn takaful": "INN Takaful",
    "takaful international": "Takaful International",
    "first takaful": "First Takaful",
    "zamzam takaful": "Zamzam Takaful",
    "ain takaful": "AIN Takaful",
    "al daman takaful": "Al Daman Takaful",
    "al muthanna takaful": "Al Muthanna Takaful",
    "al khaleej takaful": "Al Khaleej Takaful",
    "tamkeen takaful": "Tamkeen Takaful",
    "al yossr takaful": "Al Yossr Takaful",
    "takaful insurance company": "Takaful Insurance",
    "al takaful insurance": "Al Takaful Insurance",
    "islamic insurance company": "Islamic Insurance Company",
    "alawael insurance": "AlAwael Insurance",
    "al mashreq insurance": "Al Mashreq Insurance",
    "al fajer re": "Al Fajer Re",

    # ══════════════════════════════════════════════════════════════
    # ARABIE SAOUDITE
    # ══════════════════════════════════════════════════════════════
    "saudi national insurance": "SNIC",
    "snic": "SNIC",
    "saudi arabian insurance": "Saudi Arabian Insurance",
    "alinma tokio marine": "Alinma Tokio Marine",
    "allianz saudi fransi": "Allianz Saudi Fransi",
    "medgulf": "MedGulf",
    "medgulf insurance": "MedGulf",
    "medgulf takaful": "MedGulf Takaful",
    "al rajhi company for cooperative insurance": "Al Rajhi Takaful",
    "al rajhi takaful": "Al Rajhi Takaful",
    "arabian shield insurance": "Arabian Shield Insurance",
    "arabia insurance cooperative": "Arabia Insurance Cooperative",
    "saudi united cooperative insurance": "Walaa Insurance",
    "walaa insurance": "Walaa Insurance",
    "sabb takaful": "SABB Takaful",
    "buruj cooperative insurance": "Buruj Cooperative Insurance",
    "allied cooperative insurance group": "ACIG",
    "saudi indian company cooperative insurance": "Saudi Indian Insurance",
    "al manara insurance": "Al Manara Insurance",
    "ahd saudi insurance": "AHD Saudi Insurance",
    "malath cooperative insurance": "Malath Insurance",
    "al yamamah insurance": "Al Yamamah Insurance",
    "first insurance company": "First Insurance",
    "gulf insurance company": "Gulf Insurance Kuwait",
    "arabian scandinavian insurance": "Arabian Scandinavian Insurance",
    "takaful insurance": "Takaful Insurance",
    "arab german insurance": "Arab German Insurance",
    "al mashrek insurance": "Al Mashrek Insurance",
    "al badia insurance": "Al Badia Insurance",
    "national company cooperative insurance": "NCCI",
    "ncci": "NCCI",
    "egypt saudi insurance house salama": "ESIH - SALAMA",
    "saudi pearl": "Saudi Pearl",

    # ══════════════════════════════════════════════════════════════
    # JORDANIE / LIBAN / SYRIE / PALESTINE
    # ══════════════════════════════════════════════════════════════
    "jordan international insurance": "Jordan International Insurance",
    "jordan insurance company": "Jordan Insurance",
    "jordan french insurance": "Jordan French Insurance",
    "arab jordanian insurance group": "Arab Jordanian Insurance Group",
    "jordan gulf insurance": "Jordan Gulf Insurance",
    "jordan int insurance group": "Jordan International Insurance Group",
    "united insurance amman": "United Insurance Amman",
    "first insurance company jordan": "First Insurance",
    "arabia insurance company": "Arabia Insurance",
    "arabia falcon insurance": "Arabia Falcon Insurance",
    "arab orient insurance": "Arab Orient Insurance",
    "the arab orient insurance": "Arab Orient Insurance",
    "arab orient takaful": "Arab Orient Takaful",
    "arope insurance": "Arope Insurance",
    "arope insurance egypt": "Arope Insurance",
    "arope syria": "Arope Insurance",
    "arab lebanese insurance group": "ALIG",
    "alig": "ALIG",
    "adonis insurance": "Adonis Insurance",
    "adonis assurance": "Adonis Assurance",
    "cedar insurance": "Cedar Insurance",
    "cedar bankers": "Cedar Bankers",
    "main insurance reinsurance": "Main Insurance",
    "lia assurances": "LIA Assurances",
    "bankers sal": "Bankers SAL",
    "al aman takaful": "Al Aman Takaful",
    "united commercial assurance": "United Commercial Assurance",
    "la phenicienne insurance": "La Phénicienne Insurance",
    "union franco arabe": "Union Franco Arabe",
    "credit libanais assurances": "Crédit Libanais Assurances",
    "libano arabe": "Libano Arabe",
    "libano suisse": "Libano Suisse",
    "ste libano francaise": "Libano Française",
    "compagnie libanaise assurances": "Compagnie Libanaise d'Assurances",
    "assurex": "Assurex",
    "al nisr al arabi": "Al Nisr Al Arabi",
    "al nisr": "Al Nisr Al Arabi",
    "jerusalem insurance": "Jerusalem Insurance",
    "national insurance palestine": "National Insurance Palestine",
    "holy land insurance": "Holy Land Insurance",
    "palestine insurance": "Palestine Insurance",
    "syrian arab insurance": "Syrian Arab Insurance",
    "syrian islamic insurance": "Syrian Islamic Insurance",
    "arabian union international insurance": "Arabian Union International Insurance",
    "securite assurances sal": "Sécurité Assurances",
    "compagnie internationale assurances reassurances": "CIAR",
    "victoir insurance": "Victoir Insurance",
    "generales des assurances": "Générales des Assurances",

    # ══════════════════════════════════════════════════════════════
    # ÉGYPTE
    # ══════════════════════════════════════════════════════════════
    "misr insurance": "Misr Insurance",
    "misr takaful": "Misr Takaful",
    "arab misr insurance group": "Arab Misr Insurance Group",
    "suez canal insurance": "Suez Canal Insurance",
    "egyptian takaful": "Egyptian Takaful",
    "the egyptian reinsurance company": "Egyptian Re",
    "egyptian reinsurance": "Egyptian Re",
    "egyptian american insurance": "Egyptian American Insurance",
    "misr emirates takaful": "Misr Emirates Takaful",
    "tokio marine egypt takaful": "Tokio Marine Egypt Takaful",
    "axa assurance egypte": "AXA Assurance Égypte",
    "allianz egypt": "Allianz",
    "compagnie algerienne assurance transport": "CAAT",

    # ══════════════════════════════════════════════════════════════
    # IRAN
    # ══════════════════════════════════════════════════════════════
    "bimeh iran": "Bimeh Iran",
    "bimeh markazi iran": "Bimeh Markazi (Central Insurance Iran)",
    "iranian reinsurance": "Iranian Re",
    "bimeh dana": "Bimeh Dana",
    "bimeh ma": "Bimeh Ma",
    "bimeh arman": "Bimeh Arman",
    "parsian insurance": "Parsian Insurance",
    "novin insurance": "Novin Insurance",
    "mellat insurance": "Mellat Insurance",
    "razi insurance": "Razi Insurance",
    "karafarin insurance": "Karafarin Insurance",
    "sina insurance": "Sina Insurance",
    "taavon insurance": "Taavon Insurance",
    "moallem insurance": "Moallem Insurance",
    "amin reinsurance": "Amin Re",
    "ghazal insurance": "Ghazal Insurance",
    "sarmad insurance": "Sarmad Insurance",

    # ══════════════════════════════════════════════════════════════
    # TURQUIE
    # ══════════════════════════════════════════════════════════════
    "corpus sigorta": "Corpus Sigorta",
    "eureko sigorta": "Eureko Sigorta",
    "aksigorta": "Aksigorta",
    "anadolu sigorta": "Anadolu Sigorta",
    "turk nippon sigorta": "Türk Nippon Sigorta",
    "halk sigorta": "Halk Sigorta",
    "seker sigorta": "Şeker Sigorta",
    "ray sigorta": "Ray Sigorta",
    "ankara sigorta": "Ankara Sigorta",
    "atlas sigorta": "Atlas Sigorta",
    "milli reasurans": "Milli Re",
    "milli re": "Milli Re",
    "turk reasurans": "Türk Re",
    "turk re": "Türk Re",
    "turkiye sigorta": "Türkiye Sigorta",
    "doga sigorta": "Doğa Sigorta",
    "doga retakaful sigorta": "Doğa Retakaful Sigorta",
    "gunes sigorta": "Güneş Sigorta",
    "neova sigorta": "Neova Sigorta",
    "allianz sigorta": "Allianz Sigorta",
    "axa oyak sigorta": "AXA Oyak Sigorta",
    "hdı sigorta": "HDI Sigorta",
    "hdi sigorta": "HDI Sigorta",
    "garanti sigorta": "Garanti Sigorta",
    "magdeburger sigorta": "Magdeburger Sigorta",
    "sompo japan sigorta": "Sompo Japan Sigorta",
    "quick sigorta": "Quick Sigorta",
    "gulf sigorta": "Gulf Sigorta",
    "arex sigorta": "Arex Sigorta",
    "aveon sigorta": "Aveon Sigorta",
    "prive sigorta": "Privé Sigorta",
    "euro sigorta": "Euro Sigorta",
    "kibris sigorta": "Kıbrıs Sigorta",
    "bereket sigorta": "Bereket Sigorta",
    "turkish catastrophe insurance pool": "TCIP / DASK",
    "dask": "TCIP / DASK",
    "seker": "Şeker Sigorta",
    "unico sigorta": "Unico Sigorta",
    "dogan trend sigorta": "Doğan Trend Sigorta",
    "dubai starr sigorta": "Dubai Starr Sigorta",
    "tarsim": "Tarsim",
    "turkiyi katilim sigorta": "Türkiye Katılım Sigorta",

    # ══════════════════════════════════════════════════════════════
    # YÉMEN / IRAK / SOUDAN
    # ══════════════════════════════════════════════════════════════
    "trust yemen insurance": "Trust Yemen Insurance",
    "mareb yemen": "Mareb Yemen Insurance",
    "yemen insurance": "Yemen Insurance",
    "yemen islamic insurance": "Yemen Islamic Insurance",
    "juba insurance": "Juba Insurance",
    "general insurance company soudan": "General Insurance Sudan",
    "national reinsurance company sudan": "National Re Sudan",
    "middle east insurance sudan": "Middle East Insurance Sudan",
    "united insurance sudan": "United Insurance Sudan",
    "sheikan insurance": "Sheikan Insurance",
    "sudanese insurance reinsurance": "Sudanese Insurance",
    "blue nile insurance": "Blue Nile Insurance",
    "national insurance ethiopia": "National Insurance Ethiopia",
    "tibesty insurance": "Tibesty Insurance",
    "dilnia insurance": "Dilnia Insurance",
    "iraq reinsurance company": "Iraq Re",

    # ══════════════════════════════════════════════════════════════
    # INDE
    # ══════════════════════════════════════════════════════════════
    "general insurance corporation india": "GIC Re",
    "gic re": "GIC Re",
    "gic re fronting": "GIC Re",
    "gic re south africa": "GIC Re",
    "new india assurance": "New India Assurance",
    "the new india assurance": "New India Assurance",
    "united india": "United India Insurance",
    "national insurance company calcutta": "National Insurance India",
    "oriental insurance": "The Oriental Insurance",
    "iffco tokio general insurance": "IFFCO-Tokio",
    "reliance general insurance": "Reliance General Insurance",
    "shriram general insurance": "Shriram General Insurance",
    "hdfc ergo general insurance": "HDFC ERGO",
    "icici lombard": "ICICI Lombard",
    "tata aig general insurance": "Tata AIG",
    "bajaj allianz general insurance": "Bajaj Allianz",
    "cholamandalam ms general insurance": "Chola MS",
    "adamjee insurance": "Adamjee Insurance",
    "sbi general insurance": "SBI General Insurance",
    "india international": "India International Insurance",
    "aic of india": "AIC of India",
    "ecgc": "ECGC",
    "acko general insurance": "Acko General Insurance",
    "dhfl general insurance": "DHFL General Insurance",
    "pakist reinsurance": "Pakistan Re",
    "pakistan reinsurance": "Pakistan Re",
    "adamjee": "Adamjee Insurance",
    "alfalah insurance": "Alfalah Insurance",
    "the united insurance pakistan": "United Insurance Pakistan",
    "askari general insurance": "Askari General Insurance",
    "tpl insurance": "TPL Insurance",
    "magma hdi general insurance": "Magma HDI",
    "universal sompo general insurance": "Universal Sompo",
    "mahindra insurance brokers": "Mahindra Insurance",
    "solarelle insurance": "Solarelle Insurance",
    "pragati insurance": "Pragati Insurance",

    # ══════════════════════════════════════════════════════════════
    # ASIE DU SUD-EST
    # ══════════════════════════════════════════════════════════════
    "pt tugu reasuransi indonesia": "Tugu Re",
    "tugu reasuransi": "Tugu Re",
    "tugu re": "Tugu Re",
    "tugu insurance": "Tugu Insurance",
    "pt tugu pratama indonesia": "PT Tugu Pratama",
    "pt reasuransi internasional indonesia": "PT Reasuransi Internasional",
    "pt reasuransi umum indonesia": "PT Reasuransi Umum",
    "pt maskapai reasuransi indonesia": "PT Maskapai Reasuransi",
    "pt asuransi wahana tata": "PT Wahana Tata",
    "pt asuransi jasa indonesia": "PT Jasindo",
    "pt aspan": "PT ASPAN",
    "pt asuransi central asia": "PT Asuransi Central Asia",
    "pt meritz korindo insurance": "Meritz Korindo",
    "meritz korindo": "Meritz Korindo",
    "indonesian re": "Indonesian Re",
    "pvi insurance": "PVI Insurance",
    "pvi re": "PVI Re",
    "petrolimex insurance": "PJICO",
    "bao minh insurance": "Bao Minh Insurance",
    "baoviet insurance": "BaoViet Insurance",
    "vietinbank insurance": "VietinBank Insurance",
    "bidv insurance": "BIC Insurance",
    "vietnam national reinsurance": "VN-Re",
    "hanoi reinsurance": "Hanoi Re",
    "nha rong joint stock insurance": "Nha Rong Insurance",
    "malayan insurance": "Malayan Insurance",
    "malayan motor": "Malayan Motor Insurance",
    "the malayan group": "Malayan Group",
    "malaysia national insurance": "MNI",
    "malaysian national reinsurance": "Malaysian Re",
    "bangkok insurance": "Bangkok Insurance",
    "ceylinco insurance": "Ceylinco Insurance",
    "sanasa general insurance": "SANASA General Insurance",
    "sri lanka insurance": "Sri Lanka Insurance",
    "janashakthi insurance": "Janashakthi Insurance",
    "hbl insurance": "HBL Insurance",
    "etiqa insurance": "Etiqa Insurance",
    "pacific orient berhad": "Pacific & Orient",
    "liberty insurance corporation": "Liberty Insurance",
    "cathay century insurance": "Cathay Century Insurance",
    "fubon insurance": "Fubon Insurance",
    "fubon property casualty": "Fubon P&C",
    "fubon insurance vietnam": "Fubon Insurance",
    "first capital insurance": "First Capital Insurance",
    "alpha insurance surety": "Alpha Insurance",
    "tokio marine egypt": "Tokio Marine Egypt",
    "china taiping insurance": "China Taiping Insurance",
    "pt china taiping indonesia": "China Taiping Indonesia",
    "picc property casualty": "PICC P&C",
    "peoples insurance china": "PICC",
    "china life reinsurance": "China Life Re",
    "china pacific property insurance": "CPIC",
    "sinosafe general insurance": "Sinosafe",
    "generali china insurance": "Generali China",
    "tian an insurance": "Tian An Insurance",
    "anbang property casualty": "Anbang P&C",
    "zheshang property casualty": "Zheshang P&C",
    "yanzhao pc": "Yanzhao P&C",
    "china rong tong property casualty": "China Rong Tong P&C",
    "huatai property casualty": "Huatai P&C",
    "china united property insurance": "CUPI",
    "xinjiang qianhai united": "Xinjiang Qianhai",
    "hengbang pc": "Hengbang P&C",
    "dajia property casualty": "Dajia P&C",
    "anhua agricultural insurance": "Anhua Agricultural Insurance",
    "zhongyuan agricultural insurance": "Zhongyuan Agricultural Insurance",
    "sunlight agricultural mutual": "Sunlight Agricultural",
    "agriculture bank china insurance": "ABC Insurance",
    "donghai marine insurance": "Donghai Marine",
    "china coal insurance": "China Coal Insurance",
    "sunshine insurance": "Sunshine Insurance",
    "sunshine property casualty": "Sunshine P&C",
    "libo insurance": "Libo Insurance",
    "bohai property insurance": "Bohai Property Insurance",
    "yellow river pc": "Yellow River P&C",
    "zhonglu pc insurance": "Zhonglu P&C",
    "taishan property casualty": "Taishan P&C",
    "haixia goldenbridge": "Haixia Goldenbridge",
    "funde property casualty": "Funde P&C",
    "qomolangma property casualty": "Qomolangma P&C",
    "sanguard automobile insurance": "Sanguard Automobile",
    "yingda taihe property": "Yingda Taihe",
    "rongsheng property casualty": "Rongsheng P&C",
    "china international reinsurance": "China International Re",
    "taian insurance": "Taian Insurance",
    "china railway captive insurance": "China Railway Captive",
    "alltrust insurance": "Alltrust Insurance",
    "mingtai fire marine": "Mingtai Fire & Marine",
    "chung kuo insurance": "Chung Kuo Insurance",
    "south china insurance": "South China Insurance",
    "taiwan fire marine": "Taiwan Fire & Marine",
    "kuo hua insurance": "Kuo Hua Insurance",
    "first fire marine": "First Fire & Marine",
    "kb insurance": "KB Insurance",
    "korean reinsurance": "Korean Re",
    "korean re": "Korean Re",
    "samsung fire marine insurance": "Samsung Fire & Marine",
    "samsung property casualty": "Samsung P&C",
    "hanwha general insurance": "Hanwha General Insurance",
    "dongbu insurance": "Dongbu Insurance",
    "ankuk fire marine": "Ankuk Fire & Marine",
    "meritz fire marine": "Meritz Fire & Marine",
    "hyundai insurance china": "Hyundai Insurance China",
    "daewoo insurance": "Daewoo Insurance",
    "mitsui sumitomo insurance": "Mitsui Sumitomo Insurance",
    "allianz fire marine japan": "Allianz Fire & Marine Japan",
    "taipei reinsurance": "Taiping Re",
    "taiping reinsurance": "Taiping Re",
    "green delta insurance": "Green Delta Insurance",
    "sadharan bima corporation": "Sadharan Bima",
    "bangladesh national insurance": "Bangladesh National Insurance",
    "progressive insurance": "Progressive Insurance",
    "nepal reinsurance": "Nepal Re",
    "sagarmatha insurance": "Sagarmatha Insurance",
    "lumbini general insurance": "Lumbini General Insurance",
    "shikhar insurance": "Shikhar Insurance",
    "sena kalyan insurance": "Sena Kalyan Insurance",
    "prabhu insurance": "Prabhu Insurance",
    "royal insurance corporation bhutan": "Royal Insurance Bhutan",
    "mongol daatgal": "Mongol Daatgal",
    "amar daatgal": "Amar Daatgal",
    "asia insurance": "Asia Insurance",
    "europe asia insurance": "Euro Arab Insurance",
    "eurasia insurance": "Eurasia Insurance",
    "myanmar insurance": "Myanmar Insurance",
    "aya sompo insurance": "AYA Sompo Insurance",
    "abay insurance": "Abay Insurance",
    "halyk insurance": "Halyk Insurance",
    "azal sigorta": "Azal Sigorta",
    "national reinsurance philippines": "National Re Philippines",
    "stronghold insurance": "Stronghold Insurance",
    "metropolitan insurance": "Metropolitan Insurance",
    "alpha insurance surety inc": "Alpha Insurance",
    "pioneer insurance philippines": "Pioneer Insurance Philippines",
    "prudential guarantee": "Prudential Guarantee",
    "liberty insurance limited": "Liberty Insurance",
    "chubb turkey": "Chubb",
    "chubb south africa": "Chubb",
    "chubb thailand": "Chubb",
    "chubb underwriting difc": "Chubb",
    "aig chartis memsa": "AIG Chartis",
    "american home assurance aig": "AIG / American Home",
    "xl catlin middle east": "AXA XL",
    "xl insurance": "XL Insurance",
    "allied world assurance": "Allied World",
    "zurich insurance": "Zurich Insurance",
    "zurich re": "Zurich Re",
    "swiss re": "Swiss Re",
    "munich re": "Munich Re",
    "munich re dubai": "Munich Re",
    "munich reinsurance": "Munich Re",
    "munich re syndicate": "Munich Re",
    "asia capital reinsurance": "Asia Capital Re",
    "asian re": "Asian Re",
    "az re": "AZ Re",
    "mearco": "MEARCO",
    "universal re": "Universal Re",
    "coral reinsurance": "Coral Re",
    "active capital reinsurance": "Active Capital Re",
    "gn reinsurance": "GN Reinsurance",
    "pool fair aviation": "FAIR Aviation Pool",
    "pool nat cat ri": "Pool NatCat",
    "ocean re": "Ocean Re",
    "scr re": "SCR",
    "africa specialty risks": "Africa Specialty Risks (ASR)",

    # ══════════════════════════════════════════════════════════════
    # ANGOLA / MOZAMBIQUE / AUTRES LUSOPHONE
    # ══════════════════════════════════════════════════════════════
    "ensa seguros angola": "ENSA",
    "angola comp seguros": "Angola Seguros",
    "nova sociedade seguros angola": "Nova Seguros Angola",
    "hollard mocambique": "Hollard Moçambique",
    "empresa mozambicana seguros": "EMOSE",
    "mozambique re": "Mozambique Re",
    "seguradora internacional mocambique": "SIM",
    "impar insurance mozambique": "IMPAR",
    "fidelidade angola": "Fidelidade Angola",
    "sanlam angola seguros": "Sanlam Angola",
    "empresa nacional seguros resseguros": "ENSA",
    "global seguros global alliance": "Global Alliance",
    "garantia companhia seguros cabo": "Garantia Cabo Verde",
    "viva seguros": "Viva Seguros",
    "austral seguros": "Austral Seguros",
    "diamonds seguros": "Diamonds Seguros",
    "aris corretores seguros": "ARIS",

    # ══════════════════════════════════════════════════════════════
    # DIVERS / RÉASSUREURS INTERNATIONAUX
    # ══════════════════════════════════════════════════════════════
    "hannover re": "Hannover Re",
    "scor": "SCOR",
    "royal sun alliance": "RSA",
    "royal and sun alliance": "RSA",
    "axa xl": "AXA XL",
    "chubb": "Chubb",
    "travelers": "Travelers",
    "starr indemnity": "Starr Insurance",
    "international general insurance": "IGI",
    "igi insurance": "IGI",
    "gothaer": "Gothaer",
    "zurich": "Zurich Insurance",
    "allianz versicherungs": "Allianz",
    "allianz elementar": "Allianz",
    "mitsui sumitomo": "Mitsui Sumitomo Insurance",
    "hellenic reliance": "Hellenic Reliance",
    "arab war risks insurance syndicate": "Arab War Risks Syndicate",
    "arab war risks": "Arab War Risks Syndicate",
    "euro arab insurance": "Euro Arab Insurance",
    "asia insurance hong kong": "Asia Insurance (HK)",
    "china insurance": "China Insurance",
    "peoples insurance company limited": "People's Insurance",
    "amc assurance": "AMC Assurance",
    "la sonam vie": "La SONAM Vie",
    "sonar": "SONAR",
    "sacos insurance": "SACOS",
    "state assurance seychelles": "State Assurance Seychelles",
    "ny havana": "NY Havana",
    "matu": "MATU",
    "assurances madagascar": "Assurances Madagascar",
    "mutuelle assurances malagasy": "Mutuelle Assurances Malagasy",
    "national insurance tanzania": "NIC Tanzania",
    "phoenix insurance": "Phoenix Insurance",
    "jubilee insurance company kenya": "Jubilee Insurance",
    "sun insurance": "Sun Insurance",
    "capital insurance": "Capital Insurance",
    "vision insurance company": "Vision Insurance",
    "national insurance company ethiopia": "National Insurance Ethiopia",
    "oromia insurance": "Oromia Insurance",
    "kuraz insurance": "Kuraz Insurance",
    "military insurance corporation": "Military Insurance Corporation",
    "north assurance": "North Assurance",
    "continental insurance lanka": "Continental Insurance Lanka",
    "people insurance plc": "People's Insurance PLC",
    "fairfirst insurance": "FairFirst Insurance",
    "prime insurance": "Prime Insurance",
    "universal sompo": "Universal Sompo",
    "liberty insurance": "Liberty Insurance",
    "nallias": "NALLIAS",
    "trade union insurance": "Trade Union Insurance",
    "overseas insurance reinsurance": "Overseas Insurance",
    "imperial fire marine": "Imperial Fire & Marine",
    "mo assurance": "MO Assurance",
    "belife insurance": "Belife Insurance",
    "raynal assurances": "Raynal Assurances",
    "takaful insurance africa": "Takaful Insurance of Africa",
    "saar vie": "SAAR Vie",
    "saar assurances tchad": "SAAR Assurances Tchad",
    "saar insurance company": "SAAR Insurance",
    "assurances la providence": "Assurances La Providence",
    "gxa assurance": "GXA Assurance",
    "amerga insurance": "Amerga Insurance",
    "assurances omnibranches": "ARO",
    "shiba assurance": "Shiba Assurance",
    "lanala assurances": "Lanala Assurances",
    "coris assurances ivory cost": "Coris Assurances Côte d'Ivoire",
    "general insurance corporation": "GIC Re",
    "la prevoyance assurances": "La Prévoyance Assurances",
    "icea lion": "ICEA Lion",
    "alliance africa general insurance": "Alliance Africa",
    "africaine des assurances guinee": "Africaine des Assurances Guinée",
    "vista assurance guinee": "Vista Assurance Guinée",
    "societe guineenne assurance": "Société Guinéenne d'Assurance",
    "icc guinee": "ICC Guinée",
    "tropical reinsurance company": "Tropical Re",
    "pionneer": "Pioneer Insurance",
    "national cy cooperative insurance": "NCCI",
    "alliance insurance": "Alliance Insurance",
    "east west insurance": "East West Insurance",
    "asia insurance company": "Asia Insurance",
    "fm re property casualty botswana": "FM Re Botswana",
    "serenity insurance": "Serenity Insurance",
    "serenity sa": "Serenity Insurance",
    "am marrs co": "A.M. Marrs & Co.",
    "assinco": "Assinco",
    "societe africaine assurance reassurance": "SAAR",
    "assurances reassurances africaines": "ARA",
    "continental insurance": "Continental Insurance",
    "best meridian international insurance": "Best Meridian",
    "raw sur": "RAWSUR",
    "rawsur": "RAWSUR",
    "aman insurance company": "Aman Insurance",
    "trust international insurance": "Trust International Insurance",
    "trust compass insurance": "Trust Compass Insurance",
    "first insurance": "First Insurance",
    "delta insurance": "Delta Insurance",
    "africa insurance": "Africa Insurance",
    "royal insurance": "Royal Insurance",
    "international insurance": "International Insurance",
    "national insurance": "National Insurance",
    "general insurance": "General Insurance",
    "united insurance": "United Insurance",
}


# ══════════════════════════════════════════════════════════════════
#   STOP WORDS  (juridiques + secteur assurance + géographie EN + FR)
# ══════════════════════════════════════════════════════════════════

STOP_WORDS = frozenset({
    # Formes juridiques
    "ltd", "llc", "plc", "inc", "srl", "sa", "sas", "bv", "pte", "pvt",
    "co", "corp", "pty", "lic", "limited", "company", "private",
    "ste", "sal", "wll", "ssa", "pltd", "oy", "bsc", "psc", "pjsc",
    "saoc", "saog", "berhad", "tbk",
    # Connecteurs
    "and", "the", "of", "for", "ex", "de", "du", "ve", "et", "des", "la", "le",
    "d", "l",
    # Secteur assurance/réassurance
    "insurance", "reinsurance", "assurance", "assurances", "reassurance",
    "reassurances", "takaful", "retakaful",
    "compagnie", "societe", "groupe", "group", "holding", "holdings",
    "corporation", "corp", "mutual", "mutuelle", "mutuelles",
    "cooperative", "cooperative", "coopératif",
    # Géographie
    "africa", "asia", "europe", "middle", "east", "difc", "branch",
    "turkey", "egypt", "india", "singapore", "dubai", "saudi",
    "qatar", "liban", "france", "paris", "spain", "iberia", "uk",
    "tunisie", "egypte", "maroc", "turquie", "emirats", "arabie",
    "china", "malaysia", "labuan", "mauritius",
    "uganda", "kenya", "tanzania", "zambia", "zimbabwe", "botswana",
    "mozambique", "angola", "senegal", "cameroun", "gabon", "congo",
    "togo", "benin", "mali", "niger", "burkina", "faso", "guinee",
    "conakry", "ivoire", "cote", "algerie", "tunisienne",
})


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
    t = re.sub(r"[&.,()\\/\-_'\"\\+\\*@#!;:]", " ", t)
    t = re.sub(r"\b(" + "|".join(re.escape(w) for w in STOP_WORDS) + r")\b", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def preprocess(raw: str) -> str:
    t = raw.strip()
    return normalize(t)


# ══════════════════════════════════════════════════════════════════
#   CLASSE PRINCIPALE
# ══════════════════════════════════════════════════════════════════

class SmartCedanteMatcher:
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
        self._keys_raw   = list(CEDANTE_MAPPING.keys())
        self._keys_norm  = [normalize(k) for k in self._keys_raw]
        self._canonicals = [CEDANTE_MAPPING[k] for k in self._keys_raw]

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
        Trouve la cédante canonique pour un nom brut.

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
                          column: str = "INT_CEDANTE",
                          keep_debug: bool = False) -> pd.DataFrame:
        res = df[column].apply(lambda x: self.match(str(x)))
        out = df.copy()
        out["CEDANTE_CANONICAL"] = res.apply(lambda r: r["canonical"])
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

_matcher_instance: Optional[SmartCedanteMatcher] = None


def get_cedante_matcher() -> SmartCedanteMatcher:
    global _matcher_instance
    if _matcher_instance is None:
        _matcher_instance = SmartCedanteMatcher()
    return _matcher_instance
