from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Any, Dict
from datetime import date


# ── Auth ──────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str
    must_change_password: bool = False

class ConfirmResetRequest(BaseModel):
    token: str
    new_password: str

class FirstLoginPasswordRequest(BaseModel):
    new_password: str
    confirm_password: str

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_.\-\s]+$")
    full_name: str = Field(..., min_length=2, max_length=150)
    email: Optional[str] = None
    role: str = Field(..., pattern="^(admin|souscripteur|lecteur)$")
    active: bool = True

class UserCreate(UserBase):
    password: Optional[str] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    active: Optional[bool] = None
    password: Optional[str] = None

class UserOut(UserBase):
    id: int
    must_change_password: bool = False
    # Présent uniquement si l'envoi de l'email a échoué
    email_warning: Optional[str] = None

# ── Data Status ───────────────────────────────────────────────────────────────
class DataStatus(BaseModel):
    loaded: bool
    last_loaded: Optional[str]
    row_count: int
    file_path: str

# ── Filter Models ─────────────────────────────────────────────────────────────
class FilterOptions(BaseModel):
    perimetre: List[str]           # AE, AM
    type_contrat_spc: List[str]    # FAC, TTY, TTE
    specialite: List[str]
    branc: List[str]
    sous_branche: Dict[str, List[str]]  # branche -> [sous-branches]
    pays_risque: List[str]
    pays_cedante: List[str]
    courtiers: List[str]
    cedantes: List[str]
    underwriting_years: List[int]
    uw_year_default: Optional[int] = None
    statuts: List[str]
    type_of_contract: List[str]
    type_cedante_options: List[str] = []

class FilterParams(BaseModel):
    perimetre: Optional[List[str]] = None
    type_contrat_spc: Optional[List[str]] = None
    specialite: Optional[List[str]] = None
    int_spc_search: Optional[str] = None
    branche: Optional[List[str]] = None
    sous_branche: Optional[List[str]] = None
    pays_risque: Optional[List[str]] = None
    pays_cedante: Optional[List[str]] = None
    courtier: Optional[List[str]] = None
    cedante: Optional[List[str]] = None
    underwriting_years: Optional[List[int]] = None
    uw_year_min: Optional[int] = None
    uw_year_max: Optional[int] = None
    uw_years: Optional[List[int]] = None  # exact list — priority over uw_year_min/max
    statuts: Optional[List[str]] = None
    type_of_contract: Optional[List[str]] = None
    type_cedante: Optional[List[str]] = None
    prime_min: Optional[float] = None
    prime_max: Optional[float] = None
    ulr_min: Optional[float] = None
    ulr_max: Optional[float] = None
    share_min: Optional[float] = None
    share_max: Optional[float] = None
    commission_min: Optional[float] = None
    commission_max: Optional[float] = None
    courtage_min: Optional[float] = None
    courtage_max: Optional[float] = None

# ── KPI Models ────────────────────────────────────────────────────────────────
class KPISummary(BaseModel):
    total_written_premium: float
    total_resultat: float
    avg_ulr: float
    total_sum_insured: float
    contract_count: int
    ratio_resultat_prime: float

class KPIByCountry(BaseModel):
    pays: str
    written_premium: float
    resultat: float
    avg_ulr: float
    contract_count: int

class KPIByBranch(BaseModel):
    branche: str
    written_premium: float
    resultat: float
    avg_ulr: float
    contract_count: int

class KPIByBroker(BaseModel):
    courtier: str
    written_premium: float
    contract_count: int

class KPIByYear(BaseModel):
    year: int
    written_premium: float
    resultat: float
    avg_ulr: float
    contract_count: int

class PivotRequest(BaseModel):
    filters: Optional[FilterParams] = None
    row_axis: str = "INT_BRANCHE"
    col_axis: str = "UNDERWRITING_YEAR"
    value: str = "WRITTEN_PREMIUM"  # WRITTEN_PREMIUM | RESULTAT | ULR

class PivotResult(BaseModel):
    rows: List[str]
    columns: List[str]
    data: List[Dict[str, Any]]

# ── Scoring Models ────────────────────────────────────────────────────────────
class ScoringCriterion(BaseModel):
    key: str
    label: str
    weight: float  # 0-100, total must = 100
    threshold: float
    direction: str  # "lower_is_better" | "higher_is_better"

class ScoringRequest(BaseModel):
    filters: Optional[FilterParams] = None
    criteria: List[ScoringCriterion]

class MarketScore(BaseModel):
    pays: str
    branche: str
    score: float
    badge: str  # ATTRACTIF | NEUTRE | A_EVITER
    written_premium: float
    avg_ulr: float
    total_resultat: float
    avg_commission: float
    avg_share: float
    contract_count: int

class ScoringResult(BaseModel):
    markets: List[MarketScore]

# ── Comparison ────────────────────────────────────────────────────────────────
class ComparisonRequest(BaseModel):
    market_a_pays: str
    market_a_branche: str
    market_b_pays: str
    market_b_branche: str
    filters: Optional[FilterParams] = None

class MarketKPIs(BaseModel):
    pays: str
    branche: str
    written_premium: float
    resultat: float
    avg_ulr: float
    sum_insured: float
    contract_count: int
    avg_commission: float
    by_year: List[KPIByYear]
    radar: Dict[str, float]

class ComparisonResult(BaseModel):
    market_a: MarketKPIs
    market_b: MarketKPIs

# ── Contract ──────────────────────────────────────────────────────────────────
class ContractSummary(BaseModel):
    policy_id: str
    contract_number: Optional[str]
    int_spc: Optional[str]
    int_branche: Optional[str]
    int_cedante: Optional[str]
    int_broker: Optional[str]
    pays_risque: Optional[str]
    underwriting_year: Optional[int]
    status: Optional[str]
    written_premium: Optional[float]
    ulr: Optional[float]
    resultat: Optional[float]
    inception_date: Optional[str]
    expiry_date: Optional[str]
    date_accepted: Optional[str] = None
    date_confirmed: Optional[str] = None
    date_closed: Optional[str] = None
    date_cancelled: Optional[str] = None
    date_saisie: Optional[str] = None

class PaginatedContracts(BaseModel):
    total: int
    page: int
    page_size: int
    data: List[ContractSummary]

# ── Log ───────────────────────────────────────────────────────────────────────
class LogEntry(BaseModel):
    timestamp: str
    username: str
    action: str
    detail: Optional[str] = None

# ── Config ────────────────────────────────────────────────────────────────────
class ConfigUpdate(BaseModel):
    excel_file_path: Optional[str] = None
    retro_excel_file_path: Optional[str] = None
