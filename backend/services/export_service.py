import io
import csv
import pandas as pd
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from fastapi import HTTPException
from models.schemas import ScoringRequest
from services import scoring_service, data_service

def export_contracts_csv(query_filters, username: str):
    from services.data_service import data_loader
    df = data_loader.get_df()
    df = data_loader.apply_filters(df, query_filters)

    if df.empty:
        raise HTTPException(status_code=404, detail="Aucune donnée (Fichier vide ou filtres trop restrictifs)")

    export_cols = [
        "CONTRACT_NUMBER", "INT_SPC", "INT_BRANCHE", "PAYS_RISQUE", 
        "UNDERWRITING_YEAR", "CONTRACT_STATUS", "WRITTEN_PREMIUM", 
        "ULR", "RESULTAT", "INCEPTION_DATE", "EXPIRY_DATE", "INT_BROKER", "INT_CEDANTE"
    ]
    avail = [c for c in export_cols if c in df.columns]

    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow(avail)

    for _, row in df.iterrows():
        def fmt(val):
            if pd.isna(val): return ""
            if isinstance(val, pd.Timestamp): return val.strftime("%d/%m/%Y")
            if isinstance(val, float): return f"{val:.2f}".replace('.', ',')
            return str(val).strip()
        writer.writerow([fmt(row[c]) for c in avail])

    return output.getvalue().encode('utf-8-sig')

def export_scoring_pdf(filters, criteria, username: str):
    from services.data_service import data_loader
    df = data_loader.get_df()
    if filters:
        df = data_loader.apply_filters(df, filters)

    markets = scoring_service.compute_market_scores(df, criteria)
    
    output = io.BytesIO()
    doc = SimpleDocTemplate(
        output,
        pagesize=landscape(A4),
        title="Recommandations de Renouvellement",
        author="Atlantic Re Platform",
        rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30
    )

    elements = []
    styles = getSampleStyleSheet()
    title_style = styles['Title']
    title_style.textColor = colors.HexColor('#1f2937')
    
    elements.append(Paragraph("Recommandations de Renouvellement", title_style))
    elements.append(Paragraph(f"Généré le: {datetime.now().strftime('%d/%m/%Y %H:%M')}", styles['Normal']))
    elements.append(Spacer(1, 20))

    if not markets:
        elements.append(Paragraph("Aucune donnée disponible pour ces filtres.", styles['Normal']))
    else:
        data = [["Marché (Pays)", "Branche", "Score", "Recommandation", "Vol. Prime", "ULR Moyen", "Résultat", "Contrats"]]
        
        for idx, m in enumerate(markets):
            if idx > 30:
                break
            data.append([
                m.pays,
                m.branche,
                f"{m.score:.1f}",
                m.badge,
                f"{m.written_premium:,.0f}",
                f"{m.avg_ulr:.1f}%",
                f"{m.total_resultat:,.0f}",
                str(m.contract_count),
            ])

        t = Table(data, repeatRows=1)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4361ee')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f0f4ff')]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        elements.append(t)

    doc.build(elements)
    output.seek(0)
    
    return output
