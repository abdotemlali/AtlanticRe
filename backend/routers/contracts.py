from fastapi import APIRouter, Depends, Query
from typing import Optional
import pandas as pd
import numpy as np
from models.schemas import FilterParams, PaginatedContracts, ContractSummary
from routers.auth import get_current_user
from routers.filter_parser import parse_filter_params
from services.data_service import get_df, apply_filters

router = APIRouter()


@router.get("", response_model=PaginatedContracts)
def get_contracts(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=50000),
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(None),
    sort_desc: bool = Query(False),
    filters: FilterParams = Depends(parse_filter_params),
    _: dict = Depends(get_current_user),
):
    df = get_df()
    df = apply_filters(df, filters)

    if search:
        mask = df.astype(str).apply(lambda col: col.str.contains(search, case=False, na=False)).any(axis=1)
        df = df[mask]

    total = len(df)

    if sort_by and sort_by in df.columns:
        df = df.sort_values(sort_by, ascending=not sort_desc)

    start = (page - 1) * page_size
    page_df = df.iloc[start: start + page_size]

    def to_contract(row):
        def safe(val):
            if pd.isna(val): return None
            if isinstance(val, (np.integer,)): return int(val)
            if isinstance(val, (np.floating,)): return float(val)
            if isinstance(val, pd.Timestamp): return val.strftime("%d/%m/%Y")
            return val
        def format_date(val):
            if pd.isna(val): return None
            if hasattr(val, "strftime"):
                return val.strftime("%d/%m/%Y")
            val_str = str(val).strip()
            if not val_str: return None
            try:
                return pd.to_datetime(val_str, dayfirst=True).strftime("%d/%m/%Y")
            except:
                return val_str.replace("-", "/")

        return ContractSummary(
            policy_id=str(row.get("POLICY_SEQUENCE_NUMBER", "")),
            contract_number=str(row.get("CONTRACT_NUMBER", "")) or None,
            int_spc=safe(row.get("INT_SPC")),
            int_branche=safe(row.get("INT_BRANCHE")),
            int_cedante=safe(row.get("INT_CEDANTE")),
            int_broker=safe(row.get("INT_BROKER")),
            pays_risque=safe(row.get("PAYS_RISQUE")),
            underwriting_year=int(row["UNDERWRITING_YEAR"]) if pd.notna(row.get("UNDERWRITING_YEAR")) else None,
            status=safe(row.get("CONTRACT_STATUS")),
            written_premium=float(row["WRITTEN_PREMIUM"]) if pd.notna(row.get("WRITTEN_PREMIUM")) else None,
            ulr=float(row["ULR"]) if pd.notna(row.get("ULR")) else None,
            resultat=float(row["RESULTAT"]) if pd.notna(row.get("RESULTAT")) else None,
            inception_date=format_date(row.get("INCEPTION_DATE")),
            expiry_date=format_date(row.get("EXPIRY_DATE")),
            date_accepted=format_date(row.get("DATE_ACCEPTED")),
            date_confirmed=format_date(row.get("DATE_CONFIRMED")),
            date_closed=format_date(row.get("DATE_CLOSED")),
            date_cancelled=format_date(row.get("DATE_CANCELLED")),
            date_saisie=format_date(row.get("DATE_SAISIE1")),
        )

    data = [to_contract(row) for _, row in page_df.iterrows()]
    return PaginatedContracts(total=total, page=page, page_size=page_size, data=data)
