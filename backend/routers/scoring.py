from fastapi import APIRouter, Depends, HTTPException
from models.schemas import FilterParams, ScoringCriterion
from routers.auth import get_current_user, require_role
from routers.filter_parser import parse_filter_params
from repositories.log_repository import add_log
from services.data_service import get_df, apply_filters
from services import scoring_service

router = APIRouter()

# In-memory scoring defaults (shared state)
from core.config import DEFAULT_SCORING_CRITERIA
_scoring_defaults: list = [c.copy() for c in DEFAULT_SCORING_CRITERIA]


@router.post("/compute")
def compute_scoring(request: dict, _: dict = Depends(get_current_user)):
    criteria_raw = request.get("criteria", [])
    filters_raw = request.get("filters", {})

    try:
        criteria = [ScoringCriterion(**c) for c in criteria_raw]
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Critères invalides : {str(e)}")

    if criteria:
        total_weight = sum(c.weight for c in criteria)
        if abs(total_weight - 100) > 1:
            raise HTTPException(status_code=400, detail=f"La somme des poids doit être 100% (actuel: {total_weight}%)")

    df = get_df()
    if filters_raw:
        try:
            def tl(v):
                if v is None: return None
                if isinstance(v, list): return v or None
                if isinstance(v, str) and v: return [x.strip() for x in v.split(",") if x.strip()]
                return None
            fp = FilterParams(
                perimetre=tl(filters_raw.get("perimetre")), type_contrat_spc=tl(filters_raw.get("type_contrat_spc")),
                specialite=tl(filters_raw.get("specialite")), int_spc_search=filters_raw.get("int_spc_search") or None,
                branche=tl(filters_raw.get("branche")), sous_branche=tl(filters_raw.get("sous_branche")),
                pays_risque=tl(filters_raw.get("pays_risque")), pays_cedante=tl(filters_raw.get("pays_cedante")),
                courtier=tl(filters_raw.get("courtier")), cedante=tl(filters_raw.get("cedante")),
                statuts=tl(filters_raw.get("statuts")), type_of_contract=tl(filters_raw.get("type_of_contract")),
                uw_year_min=filters_raw.get("uw_year_min"), uw_year_max=filters_raw.get("uw_year_max"),
            )
            df = apply_filters(df, fp)
        except Exception:
            pass

    markets = scoring_service.compute_market_scores(df, criteria)

    def clean(m: dict) -> dict:
        return {k: (0.0 if isinstance(v, float) and v != v else v) for k, v in m.items()}

    return {"markets": [clean(m.dict()) for m in markets]}


@router.get("/defaults")
def get_scoring_defaults(_: dict = Depends(get_current_user)):
    return {"criteria": _scoring_defaults}


@router.put("/defaults")
def update_scoring_defaults(data: dict, user: dict = Depends(require_role("admin"))):
    global _scoring_defaults
    if "criteria" in data:
        _scoring_defaults = data["criteria"]
        add_log(user["username"], "UPDATE_SCORING_DEFAULTS")
    return {"criteria": _scoring_defaults}
