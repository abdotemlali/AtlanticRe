from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from datetime import datetime
from routers.auth import require_role
from routers.filter_parser import parse_filter_params
from models.schemas import FilterParams
from services.data_service import get_df, apply_filters, compute_kpi_summary
import io
import pandas as pd
import xlsxwriter

router = APIRouter()

# ── Palette (matches frontend CSS variables) ──────────────────────────────────
C_NAVY   = '#2D3E50'
C_OLIVE  = '#4E6820'
C_WHITE  = '#FFFFFF'
C_BG_ALT = '#EEF0F3'
C_GREY   = '#7A8A99'


def _build_filter_params_from_dict(d: dict) -> FilterParams:
    if not d:
        return FilterParams()

    def tl(v):
        if v is None: return None
        if isinstance(v, list): return v or None
        if isinstance(v, str) and v: return [x.strip() for x in v.split(",") if x.strip()]
        return None

    return FilterParams(
        perimetre=tl(d.get("perimetre")), type_contrat_spc=tl(d.get("type_contrat_spc")),
        specialite=tl(d.get("specialite")), int_spc_search=d.get("int_spc_search") or None,
        branche=tl(d.get("branche")), sous_branche=tl(d.get("sous_branche")),
        pays_risque=tl(d.get("pays_risque")), pays_cedante=tl(d.get("pays_cedante")),
        courtier=tl(d.get("courtier")), cedante=tl(d.get("cedante")),
        statuts=tl(d.get("statuts")), type_of_contract=tl(d.get("type_of_contract")),
        uw_year_min=d.get("uw_year_min"), uw_year_max=d.get("uw_year_max"),
        prime_min=d.get("prime_min"), prime_max=d.get("prime_max"),
        ulr_min=d.get("ulr_min"), ulr_max=d.get("ulr_max"),
        share_min=d.get("share_min"), share_max=d.get("share_max"),
        commission_min=d.get("commission_min"), commission_max=d.get("commission_max"),
        courtage_min=d.get("courtage_min"), courtage_max=d.get("courtage_max"),
    )


@router.post("/csv")
def export_csv(request: dict, user: dict = Depends(require_role("admin", "souscripteur"))):
    fp = _build_filter_params_from_dict(request.get("filters", {}))
    df = get_df()
    df = apply_filters(df, fp)

    output = io.StringIO()
    output.write('\ufeff')
    df.to_csv(output, index=False, sep=';', encoding='utf-8')
    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=reinsurance_export.csv"},
    )


@router.post("/excel")
def export_excel(request: dict, user: dict = Depends(require_role("admin", "souscripteur"))):
    """Details export — styled with brand colours."""
    fp = _build_filter_params_from_dict(request.get("filters", {}))
    df = get_df()
    df = apply_filters(df, fp)

    output   = io.BytesIO()
    workbook = xlsxwriter.Workbook(output, {'in_memory': True})
    ws       = workbook.add_worksheet("Données")

    hdr_fmt = workbook.add_format({
        'bold': True, 'font_color': C_WHITE, 'bg_color': C_NAVY,
        'border': 1, 'border_color': '#1A2A38',
        'align': 'center', 'valign': 'vcenter', 'font_size': 10,
    })
    row_even = workbook.add_format({
        'bg_color': C_WHITE, 'border': 1, 'border_color': '#CBD2DA',
        'font_size': 9, 'valign': 'vcenter',
    })
    row_odd = workbook.add_format({
        'bg_color': C_BG_ALT, 'border': 1, 'border_color': '#CBD2DA',
        'font_size': 9, 'valign': 'vcenter',
    })
    num_even = workbook.add_format({
        'bg_color': C_WHITE, 'border': 1, 'border_color': '#CBD2DA',
        'num_format': '#,##0.00', 'align': 'right', 'font_size': 9,
    })
    num_odd = workbook.add_format({
        'bg_color': C_BG_ALT, 'border': 1, 'border_color': '#CBD2DA',
        'num_format': '#,##0.00', 'align': 'right', 'font_size': 9,
    })
    title_fmt = workbook.add_format({'bold': True, 'font_size': 14, 'font_color': C_NAVY})
    meta_fmt  = workbook.add_format({'font_size': 9, 'font_color': C_GREY, 'italic': True})

    ws.set_row(0, 22)
    ws.set_row(1, 16)
    ws.merge_range("A1:G1", "Atlantic Re — Export des données", title_fmt)
    ws.write("A2", f"Généré le {datetime.now().strftime('%d/%m/%Y  %H:%M')}  |  {len(df)} lignes", meta_fmt)

    headers = list(df.columns)
    ws.set_row(2, 18)
    for c_idx, col in enumerate(headers):
        ws.write(2, c_idx, col, hdr_fmt)
        ws.set_column(c_idx, c_idx, max(len(str(col)) + 4, 14))

    num_types = {'int64', 'float64', 'int32', 'float32'}
    for r_idx, row in enumerate(df.itertuples(index=False), start=3):
        is_even = r_idx % 2 == 0
        for c_idx, val in enumerate(row):
            if df.dtypes.iloc[c_idx].name in num_types:
                fmt = num_even if is_even else num_odd
                ws.write_number(r_idx, c_idx, float(val) if val == val else 0, fmt)
            else:
                fmt = row_even if is_even else row_odd
                ws.write(r_idx, c_idx, str(val) if val is not None else '', fmt)

    ws.freeze_panes(3, 0)
    ws.autofilter(2, 0, 2 + len(df), len(headers) - 1)
    workbook.close()
    output.seek(0)

    return StreamingResponse(
        iter([output.read()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=reinsurance_details.xlsx"},
    )


@router.post("/pivot")
def export_pivot(request: dict, user: dict = Depends(require_role("admin", "souscripteur"))):
    """Export the pivot table as a styled Excel file."""
    pivot_data  = request.get("data", [])
    columns     = request.get("columns", [])
    row_label   = request.get("row_label", "Libellé")
    value_label = request.get("value_label", "Valeur")
    date_str    = datetime.now().strftime('%d/%m/%Y  %H:%M')

    if not pivot_data or not columns:
        return StreamingResponse(iter([b'']), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

    output   = io.BytesIO()
    workbook = xlsxwriter.Workbook(output, {'in_memory': True})
    ws       = workbook.add_worksheet("Tableau croisé")

    title_fmt = workbook.add_format({'bold': True, 'font_size': 13, 'font_color': C_NAVY})
    meta_fmt  = workbook.add_format({'font_size': 9, 'font_color': C_GREY, 'italic': True})
    hdr_fmt   = workbook.add_format({
        'bold': True, 'font_color': C_WHITE, 'bg_color': C_NAVY,
        'border': 1, 'border_color': '#1A2A38',
        'align': 'center', 'valign': 'vcenter', 'font_size': 10,
    })
    col_hdr = workbook.add_format({
        'bold': True, 'font_color': C_WHITE, 'bg_color': C_OLIVE,
        'border': 1, 'border_color': '#2D4015',
        'align': 'center', 'valign': 'vcenter', 'font_size': 10,
    })
    label_fmt = workbook.add_format({
        'bold': True, 'font_color': C_NAVY, 'bg_color': C_BG_ALT,
        'border': 1, 'border_color': '#CBD2DA', 'font_size': 9,
    })
    num_even = workbook.add_format({
        'num_format': '#,##0.00', 'bg_color': C_WHITE,
        'border': 1, 'border_color': '#CBD2DA',
        'align': 'right', 'font_size': 9,
    })
    num_odd = workbook.add_format({
        'num_format': '#,##0.00', 'bg_color': C_BG_ALT,
        'border': 1, 'border_color': '#CBD2DA',
        'align': 'right', 'font_size': 9,
    })
    total_fmt = workbook.add_format({
        'bold': True, 'num_format': '#,##0.00', 'bg_color': '#D0D8E4',
        'border': 1, 'border_color': '#9AA8B5',
        'align': 'right', 'font_size': 9, 'font_color': C_NAVY,
    })
    zero_fmt = workbook.add_format({
        'font_color': '#C8CDD6', 'bg_color': C_WHITE,
        'border': 1, 'border_color': '#CBD2DA',
        'align': 'center', 'font_size': 9,
    })

    num_cols = len(columns) + 2
    ws.set_row(0, 22)
    ws.set_row(1, 14)
    ws.merge_range(0, 0, 0, num_cols - 1, "Atlantic Re — Tableau Croisé Dynamique", title_fmt)
    ws.write(1, 0, f"Généré le {date_str}  |  Lignes : {row_label}  |  Valeur : {value_label}", meta_fmt)

    ws.set_row(2, 18)
    ws.write(2, 0, row_label, hdr_fmt)
    ws.set_column(0, 0, 22)
    for c_i, col in enumerate(columns, 1):
        ws.write(2, c_i, str(col), col_hdr)
        ws.set_column(c_i, c_i, max(len(str(col)) + 3, 14))
    ws.write(2, len(columns) + 1, "TOTAL", hdr_fmt)
    ws.set_column(len(columns) + 1, len(columns) + 1, 16)

    totals_by_col = {col: 0.0 for col in columns}
    for r_i, row in enumerate(pivot_data, 3):
        is_even = r_i % 2 == 0
        nf = num_even if is_even else num_odd
        ws.write(r_i, 0, row.get("label", ""), label_fmt)
        row_total = 0.0
        for c_i, col in enumerate(columns, 1):
            val = float(row.get(col, 0) or 0)
            row_total += val
            totals_by_col[col] = totals_by_col.get(col, 0.0) + val
            if val == 0:
                ws.write(r_i, c_i, "—", zero_fmt)
            else:
                ws.write_number(r_i, c_i, val, nf)
        ws.write_number(r_i, len(columns) + 1, row_total, total_fmt)

    grand_total_row = 3 + len(pivot_data)
    ws.set_row(grand_total_row, 16)
    ws.write(grand_total_row, 0, "TOTAL GÉNÉRAL", hdr_fmt)
    grand_total = 0.0
    for c_i, col in enumerate(columns, 1):
        ct = totals_by_col[col]
        grand_total += ct
        ws.write_number(grand_total_row, c_i, ct, total_fmt)
    ws.write_number(grand_total_row, len(columns) + 1, grand_total, total_fmt)

    ws.freeze_panes(3, 1)
    workbook.close()
    output.seek(0)

    return StreamingResponse(
        iter([output.read()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=pivot_reinsurance.xlsx"},
    )


@router.post("/pdf")
def export_pdf(request: dict, user: dict = Depends(require_role("admin", "souscripteur"))):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm

    markets = request.get("markets", [])
    top_n = request.get("top_n", 10)
    date_str = datetime.now().strftime("%d/%m/%Y %H:%M")

    output = io.BytesIO()
    doc = SimpleDocTemplate(output, pagesize=landscape(A4))
    styles = getSampleStyleSheet()
    elements = []

    title_style = ParagraphStyle('title', parent=styles['Title'], fontSize=16, textColor=colors.HexColor('#2D3E50'))
    sub_style = ParagraphStyle('sub', parent=styles['Normal'], fontSize=10, textColor=colors.grey)

    elements.append(Paragraph("Rapport de Recommandations — Réassurance", title_style))
    elements.append(Paragraph(f"Généré le {date_str} | Top {top_n} marchés", sub_style))
    elements.append(Spacer(1, 0.5 * cm))

    if markets:
        headers = ["Rang", "Pays", "Branche", "Score", "Badge", "Prime Écrite", "LR Moy.", "Résultat", "Nb Contrats"]
        data = [headers]
        for i, m in enumerate(markets[:top_n], 1):
            data.append([
                str(i), m.get("pays", ""), m.get("branche", ""),
                f"{m.get('score', 0):.1f}", m.get("badge", ""),
                f"{m.get('written_premium', 0):,.0f}",
                f"{m.get('avg_ulr', 0):.1f}%",
                f"{m.get('total_resultat', 0):,.0f}",
                str(m.get("contract_count", 0)),
            ])

        t = Table(data, repeatRows=1)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2D3E50')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#EEF0F3')]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD2DA')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        elements.append(t)

    doc.build(elements)
    output.seek(0)

    return StreamingResponse(
        iter([output.read()]),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=recommandations_reinsurance.pdf"},
    )
