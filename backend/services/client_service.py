"""
Service métier pour la détection des cédantes inactives.
Calcul 100% pandas — n'utilise pas la DB, n'accède qu'au DataFrame global.
"""
import io
import pandas as pd
from typing import List, Dict, Any
import xlsxwriter


def get_inactive_clients(
    df: pd.DataFrame,
    years_threshold: int = 2,
    min_contracts: int = 3,
) -> Dict[str, Any]:
    """
    Détecte les cédantes inactives dans le DataFrame.

    Une cédante est INACTIVE si :
    - Elle a au moins `min_contracts` contrats au total
    - Elle n'a aucun contrat dans les `years_threshold` dernières années
      (par rapport à MAX(UNDERWRITING_YEAR) du dataset)

    Retourne un dict avec les clés :
        reference_year, total_inactive, clients (liste de dicts)
    """
    required = {"INT_CEDANTE", "CEDANT_CODE", "UNDERWRITING_YEAR"}
    if df.empty or not required.issubset(df.columns):
        return {"reference_year": None, "total_inactive": 0, "clients": []}

    # ── Année de référence ────────────────────────────────────────────────────
    df = df.copy()
    df["UNDERWRITING_YEAR"] = pd.to_numeric(df["UNDERWRITING_YEAR"], errors="coerce")
    valid_years = df["UNDERWRITING_YEAR"].dropna()
    if valid_years.empty:
        return {"reference_year": None, "total_inactive": 0, "clients": []}

    reference_year = int(valid_years.max())
    cutoff_year = reference_year - years_threshold  # must have had activity BEFORE this

    # ── Groupby (INT_CEDANTE, CEDANT_CODE) avec reset_index ──────────────────

    # Total contracts per client
    total_contracts = df.groupby(
        ["INT_CEDANTE", "CEDANT_CODE"]
    ).size().reset_index(name="total_contracts")

    # Last year active
    last_year = (
        df.dropna(subset=["UNDERWRITING_YEAR"])
        .groupby(["INT_CEDANTE", "CEDANT_CODE"])["UNDERWRITING_YEAR"]
        .max()
        .reset_index(name="last_year_active")
    )
    last_year["last_year_active"] = last_year["last_year_active"].astype(int)

    # Pays cedante (le plus fréquent via vectorisation au lieu de python lambda mode qui est très lent)
    pays_col = "PAYS_CEDANTE" if "PAYS_CEDANTE" in df.columns else None
    if pays_col:
        pays = (
            df.dropna(subset=[pays_col])
            .groupby(["INT_CEDANTE", "CEDANT_CODE", pays_col])
            .size()
            .reset_index(name="count")
            .sort_values("count", ascending=False)
            .drop_duplicates(["INT_CEDANTE", "CEDANT_CODE"])
            .rename(columns={pays_col: "pays_cedante"})
        )[["INT_CEDANTE", "CEDANT_CODE", "pays_cedante"]]
    else:
        pays = None

    # Statuts breakdown
    if "CONTRACT_STATUS" in df.columns:
        statuts_breakdown = (
            df.groupby(["INT_CEDANTE", "CEDANT_CODE", "CONTRACT_STATUS"])
            .size()
            .reset_index(name="cnt")
        )
    else:
        statuts_breakdown = None

    # ── Merge ─────────────────────────────────────────────────────────────────
    merged = total_contracts.merge(last_year, on=["INT_CEDANTE", "CEDANT_CODE"], how="left")
    if pays is not None:
        merged = merged.merge(pays, on=["INT_CEDANTE", "CEDANT_CODE"], how="left")
        merged["pays_cedante"] = merged["pays_cedante"].fillna("")
    else:
        merged["pays_cedante"] = ""

    # ── Filtrage inactifs ─────────────────────────────────────────────────────
    inactive = merged[
        (merged["total_contracts"] >= min_contracts) &
        (merged["last_year_active"] <= cutoff_year)
    ].copy()

    inactive["years_absent"] = reference_year - inactive["last_year_active"]

    # Pré-calculer un dict indexé par (INT_CEDANTE, CEDANT_CODE) via Pandas natif (unstack)
    statuts_dict: dict = {}
    if statuts_breakdown is not None and not statuts_breakdown.empty:
        unstacked = (
            statuts_breakdown.set_index(["INT_CEDANTE", "CEDANT_CODE", "CONTRACT_STATUS"])["cnt"]
            .unstack(fill_value=0)
            .astype(int)
        )
        statuts_dict = unstacked.to_dict(orient="index")

    # On utilise to_dict("records") au lieu d'iterrows pour beaucoup plus de performances
    inactive_records = inactive.to_dict("records")
    clients = []
    
    for row in inactive_records:
        key = (row["INT_CEDANTE"], row["CEDANT_CODE"])
        clients.append({
            "cedant_code":      row["CEDANT_CODE"],
            "int_cedante":      row["INT_CEDANTE"],
            "total_contracts":  int(row["total_contracts"]),
            "last_year_active": int(row["last_year_active"]),
            "years_absent":     int(row["years_absent"]),
            "pays_cedante":     str(row.get("pays_cedante", "") if not pd.isna(row.get("pays_cedante")) else ""),
            "statuts_breakdown": statuts_dict.get(key, {}),
        })

    return {
        "reference_year": reference_year,
        "total_inactive": len(clients),
        "clients": clients,
    }


def export_inactive_clients_excel(
    clients: List[Dict[str, Any]],
    reference_year: int,
    years_threshold: int,
    min_contracts: int,
) -> io.BytesIO:
    """
    Génère un fichier Excel stylisé avec la liste des clients inactifs.
    Retourne un BytesIO prêt à streamer.
    """
    C_NAVY   = '#2D3E50'
    C_OLIVE  = '#4E6820'
    C_WHITE  = '#FFFFFF'
    C_BG_ALT = '#EEF0F3'
    C_GREY   = '#7A8A99'
    C_RED    = '#D64045'
    C_ORANGE = '#F4A261'

    output   = io.BytesIO()
    workbook = xlsxwriter.Workbook(output, {'in_memory': True})
    ws       = workbook.add_worksheet("Clients Inactifs")

    # Formats
    title_fmt = workbook.add_format({'bold': True, 'font_size': 14, 'font_color': C_NAVY})
    meta_fmt  = workbook.add_format({'font_size': 9, 'font_color': C_GREY, 'italic': True})
    hdr_fmt   = workbook.add_format({
        'bold': True, 'font_color': C_WHITE, 'bg_color': C_NAVY,
        'border': 1, 'border_color': '#1A2A38',
        'align': 'center', 'valign': 'vcenter', 'font_size': 10,
    })
    row_even = workbook.add_format({
        'bg_color': C_WHITE, 'border': 1, 'border_color': '#CBD2DA', 'font_size': 9,
    })
    row_odd  = workbook.add_format({
        'bg_color': C_BG_ALT, 'border': 1, 'border_color': '#CBD2DA', 'font_size': 9,
    })
    num_even = workbook.add_format({
        'num_format': '#,##0', 'bg_color': C_WHITE,
        'border': 1, 'border_color': '#CBD2DA', 'align': 'right', 'font_size': 9,
    })
    num_odd  = workbook.add_format({
        'num_format': '#,##0', 'bg_color': C_BG_ALT,
        'border': 1, 'border_color': '#CBD2DA', 'align': 'right', 'font_size': 9,
    })
    red_fmt  = workbook.add_format({
        'bold': True, 'font_color': C_WHITE, 'bg_color': C_RED,
        'border': 1, 'border_color': '#A03030',
        'align': 'center', 'font_size': 9,
    })
    orange_fmt = workbook.add_format({
        'bold': True, 'font_color': C_WHITE, 'bg_color': '#D4831C',
        'border': 1, 'border_color': '#A06010',
        'align': 'center', 'font_size': 9,
    })

    from datetime import datetime
    ws.set_row(0, 22)
    ws.set_row(1, 14)
    ws.merge_range("A1:H1", "Atlantic Re — Cédantes Inactives", title_fmt)
    ws.write("A2", (
        f"Généré le {datetime.now().strftime('%d/%m/%Y %H:%M')}  |  "
        f"Année de référence : {reference_year}  |  "
        f"Seuil : {years_threshold} an(s) d'absence  |  "
        f"Min. contrats : {min_contracts}  |  "
        f"{len(clients)} cédante(s) inactives"
    ), meta_fmt)

    headers = [
        "INT_CEDANTE", "CEDANT_CODE", "PAYS_CEDANTE",
        "Total Contrats", "Dernière Année", "Années d'absence",
        "Statuts CONFIRMED", "Statuts CLOSED",
    ]
    col_widths = [35, 14, 18, 14, 14, 16, 17, 14]

    ws.set_row(2, 18)
    for c_i, (h, w) in enumerate(zip(headers, col_widths)):
        ws.write(2, c_i, h, hdr_fmt)
        ws.set_column(c_i, c_i, w)

    for r_i, client in enumerate(clients, 3):
        is_even = r_i % 2 == 0
        tf = row_even if is_even else row_odd
        nf = num_even if is_even else num_odd
        yrs_absent = client.get("years_absent", 0)
        abs_fmt = red_fmt if yrs_absent > 3 else (orange_fmt if yrs_absent >= 2 else num_even)

        ws.write(r_i, 0, client.get("int_cedante", ""),      tf)
        ws.write(r_i, 1, client.get("cedant_code", ""),      tf)
        ws.write(r_i, 2, client.get("pays_cedante", ""),     tf)
        ws.write_number(r_i, 3, client.get("total_contracts", 0), nf)
        ws.write_number(r_i, 4, client.get("last_year_active", 0), nf)
        ws.write_number(r_i, 5, yrs_absent,                  abs_fmt)
        ws.write_number(r_i, 6, client.get("statuts_breakdown", {}).get("CONFIRMED", 0), nf)
        ws.write_number(r_i, 7, client.get("statuts_breakdown", {}).get("CLOSED", 0),    nf)

    ws.freeze_panes(3, 0)
    workbook.close()
    output.seek(0)
    return output

def get_renewal_analysis(df: pd.DataFrame) -> dict:
    if df.empty or "RENEWALE_CONTRACT" not in df.columns or "UNDERWRITING_YEAR" not in df.columns:
        return {"by_year": [], "by_cedante": []}
    
    df = df.copy()
    df["UNDERWRITING_YEAR"] = pd.to_numeric(df["UNDERWRITING_YEAR"], errors="coerce")
    df["is_renewal"] = df["RENEWALE_CONTRACT"].notna() & (df["RENEWALE_CONTRACT"].astype(str).str.strip() != "")
    
    # Par année
    by_year = []
    for year, group in df.dropna(subset=["UNDERWRITING_YEAR"]).groupby("UNDERWRITING_YEAR"):
        total = len(group)
        renewals = int(group["is_renewal"].sum())
        by_year.append({
            "year": int(year),
            "total": total,
            "renewals": renewals,
            "new_business": total - renewals,
            "retention_rate": round(renewals / total * 100, 1) if total > 0 else 0,
        })
    by_year.sort(key=lambda x: x["year"])
    
    # Par cédante top 15
    by_cedante = []
    for cedante, group in df.groupby("INT_CEDANTE"):
        if not cedante:
            continue
        total = len(group)
        renewals = int(group["is_renewal"].sum())
        by_cedante.append({
            "cedante": cedante,
            "total": total,
            "renewals": renewals,
            "new_business": total - renewals,
            "retention_rate": round(renewals / total * 100, 1) if total > 0 else 0,
        })
    by_cedante.sort(key=lambda x: x["total"], reverse=True)
    
    return {"by_year": by_year, "by_cedante": by_cedante[:15]}
