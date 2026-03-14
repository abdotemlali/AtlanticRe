from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from routers.auth import require_role, get_current_user
from routers.admin import _app_config
from services.data_service import get_df, apply_filters, get_status, get_filter_options, load_excel
from models.schemas import DataStatus, FilterParams
from repositories.log_repository import add_log
import io
import pandas as pd

router = APIRouter()


@router.post("/refresh")
def refresh_data(user: dict = Depends(require_role("admin", "souscripteur"))):
    try:
        result = load_excel(_app_config["excel_file_path"])
        add_log(user["username"], "DATA_REFRESH", f"{result['row_count']} lignes chargées")
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de chargement : {str(e)}")


@router.get("/status", response_model=DataStatus)
def data_status(_: dict = Depends(get_current_user)):
    return DataStatus(**get_status())


@router.get("/filters/options")
def filter_options(_: dict = Depends(get_current_user)):
    df = get_df()
    return get_filter_options(df)
