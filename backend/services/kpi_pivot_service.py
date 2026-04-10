"""
Service KPI Pivot — tableau croisé dynamique générique.
Aucune branche, pays ou cédante codée en dur.
"""
import pandas as pd
from typing import Dict, Any, Optional
from models.schemas import FilterParams
from services.data_service import apply_filters, get_df


def compute_pivot(
    df: pd.DataFrame,
    row_axis: str,
    col_axis: str,
    value_key: str,
) -> Dict[str, Any]:
    """
    Construit un tableau croisé dynamique entièrement paramétrable.
    row_axis, col_axis, value_key sont des noms de colonnes dynamiques.
    """
    if df.empty:
        return {"rows": [], "columns": [], "data": []}

    col_map = {"WRITTEN_PREMIUM": "WRITTEN_PREMIUM", "RESULTAT": "RESULTAT", "ULR": "ULR"}
    value_col = col_map.get(value_key, "WRITTEN_PREMIUM")
    row_axis = row_axis if row_axis in df.columns else "INT_BRANCHE"
    col_axis = col_axis if col_axis in df.columns else "UNDERWRITING_YEAR"

    try:
        pivot = df.pivot_table(
            values=value_col,
            index=row_axis,
            columns=col_axis,
            aggfunc="sum",
            fill_value=0,
        )
        columns = [str(c) for c in pivot.columns.tolist()]
        data = []
        for r in pivot.index:
            row_data = {"label": str(r)}
            for c in pivot.columns:
                val = float(pivot.loc[r, c])
                row_data[str(c)] = 0.0 if val != val else round(val, 2)
            data.append(row_data)
        return {
            "rows": [str(r) for r in pivot.index.tolist()],
            "columns": columns,
            "data": data,
        }
    except Exception as e:
        return {"rows": [], "columns": [], "data": [], "error": str(e)}


def parse_pivot_filters(filters_raw: dict) -> pd.DataFrame:
    """
    Parse les filtres bruts du body JSON et retourne un DataFrame filtré.
    Gère le cas où les filtres sont envoyés via POST body.
    """
    df = get_df()
    if not filters_raw:
        return df
    try:
        def tl(v):
            if v is None:
                return None
            if isinstance(v, list):
                return v or None
            if isinstance(v, str) and v:
                return [x.strip() for x in v.split(",") if x.strip()]
            return None

        fp = FilterParams(
            perimetre=tl(filters_raw.get("perimetre")),
            type_contrat_spc=tl(filters_raw.get("type_contrat_spc")),
            specialite=tl(filters_raw.get("specialite")),
            int_spc_search=filters_raw.get("int_spc_search") or None,
            branche=tl(filters_raw.get("branche")),
            sous_branche=tl(filters_raw.get("sous_branche")),
            pays_risque=tl(filters_raw.get("pays_risque")),
            pays_cedante=tl(filters_raw.get("pays_cedante")),
            courtier=tl(filters_raw.get("courtier")),
            cedante=tl(filters_raw.get("cedante")),
            statuts=tl(filters_raw.get("statuts")),
            type_of_contract=tl(filters_raw.get("type_of_contract")),
        )
        return apply_filters(df, fp)
    except Exception:
        return df
