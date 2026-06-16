"""
core/pdf_export.py — Shared PDF generation utility using ReportLab.

Generates branded PDF reports for PinAI location insights, DocPatram documents,
and VaadVivaad dispute summaries. All PDFs include the AIKosh attribution footer.
"""

import io
import logging
from datetime import datetime
from typing import Optional, List, Dict

logger = logging.getLogger("core.pdf_export")

# Brand constants
BRAND_NAME = "Ayojit Intelligence"
BRAND_COLOR_HEX = "#FCD34D"
ATTRIBUTION = (
    "This report uses AI models/datasets from AIKosh (aikosh.indiaai.gov.in), "
    "maintained by IndiaAI under MeitY, Government of India. "
    f"{BRAND_NAME} is not affiliated with or endorsed by AIKosh or the Government of India."
)


def _ensure_reportlab():
    """Check that reportlab is installed."""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        return True
    except ImportError:
        logger.error("reportlab not installed. Run: pip install reportlab")
        return False


def generate_pdf(
    title: str,
    sections: List[Dict],
    metadata: Optional[Dict] = None,
    app_id: str = "general",
) -> bytes:
    """
    Generate a branded PDF document.

    Args:
        title: Document title displayed in the header.
        sections: List of dicts, each with 'heading' (str) and 'content' (str or list of str).
        metadata: Optional dict of key-value pairs shown in the metadata block.
        app_id: App identifier for styling and context.

    Returns:
        PDF file as bytes.
    """
    if not _ensure_reportlab():
        raise RuntimeError("reportlab is not installed")

    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm, cm
    from reportlab.lib.colors import HexColor, black, white
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    )
    from reportlab.lib.enums import TA_LEFT, TA_CENTER

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=25 * mm,
        bottomMargin=25 * mm,
    )

    styles = getSampleStyleSheet()

    # Custom styles matching Neo-Brutalism aesthetics
    title_style = ParagraphStyle(
        "BrutTitle",
        parent=styles["Heading1"],
        fontSize=22,
        fontName="Helvetica-Bold",
        spaceAfter=4 * mm,
        textColor=black,
        leading=26,
    )

    heading_style = ParagraphStyle(
        "BrutHeading",
        parent=styles["Heading2"],
        fontSize=14,
        fontName="Helvetica-Bold",
        spaceBefore=6 * mm,
        spaceAfter=3 * mm,
        textColor=black,
        leading=18,
        textTransform="uppercase",
    )

    body_style = ParagraphStyle(
        "BrutBody",
        parent=styles["Normal"],
        fontSize=10,
        fontName="Helvetica",
        spaceAfter=3 * mm,
        leading=14,
    )

    meta_style = ParagraphStyle(
        "BrutMeta",
        parent=styles["Normal"],
        fontSize=8,
        fontName="Courier",
        textColor=HexColor("#71717A"),
        spaceAfter=2 * mm,
        leading=10,
    )

    footer_style = ParagraphStyle(
        "BrutFooter",
        parent=styles["Normal"],
        fontSize=7,
        fontName="Courier",
        textColor=HexColor("#A1A1AA"),
        alignment=TA_CENTER,
        leading=9,
    )

    # App emoji mapping
    app_emojis = {
        "pinai": "📍",
        "docpatram": "📄",
        "vaadvivaad": "⚖️",
        "hindidiff": "🎨",
        "kisan-voice-ai": "🌾",
    }
    emoji = app_emojis.get(app_id, "📋")

    # Build document elements
    elements = []

    # Header block
    header_data = [[
        Paragraph(f"<b>{BRAND_NAME.upper()}</b>", ParagraphStyle(
            "HeaderLeft", parent=styles["Normal"], fontSize=8,
            fontName="Helvetica-Bold", textColor=black
        )),
        Paragraph(
            f"Generated: {datetime.utcnow().strftime('%d %b %Y, %H:%M UTC')}",
            meta_style
        ),
    ]]
    header_table = Table(header_data, colWidths=[doc.width * 0.6, doc.width * 0.4])
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), HexColor(BRAND_COLOR_HEX)),
        ("BOX", (0, 0), (-1, -1), 2, black),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 6 * mm))

    # Title
    elements.append(Paragraph(f"{emoji} {title}", title_style))

    # Metadata block
    if metadata:
        meta_rows = [[
            Paragraph(f"<b>{k}:</b>", meta_style),
            Paragraph(str(v), meta_style),
        ] for k, v in metadata.items()]
        meta_table = Table(meta_rows, colWidths=[doc.width * 0.3, doc.width * 0.7])
        meta_table.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 1, HexColor("#D4D4D8")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, HexColor("#E4E4E7")),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 4 * mm))

    elements.append(HRFlowable(width="100%", thickness=2, color=black))
    elements.append(Spacer(1, 4 * mm))

    # Content sections
    for section in sections:
        heading = section.get("heading", "")
        content = section.get("content", "")

        if heading:
            elements.append(Paragraph(heading.upper(), heading_style))

        if isinstance(content, list):
            for item in content:
                elements.append(Paragraph(f"• {item}", body_style))
        elif isinstance(content, str):
            # Split by newlines for multi-paragraph content
            for para in content.split("\n"):
                para = para.strip()
                if para:
                    elements.append(Paragraph(para, body_style))
        elements.append(Spacer(1, 2 * mm))

    # Attribution footer
    elements.append(Spacer(1, 8 * mm))
    elements.append(HRFlowable(width="100%", thickness=1, color=HexColor("#D4D4D8")))
    elements.append(Spacer(1, 3 * mm))
    elements.append(Paragraph(ATTRIBUTION, footer_style))

    # Build PDF
    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    logger.info(f"PDF generated: title='{title}', app={app_id}, size={len(pdf_bytes)} bytes")
    return pdf_bytes


def generate_pinai_report(
    pincode: str,
    location: Dict,
    metrics: Dict,
    insight: str,
) -> bytes:
    """Generate a PinAI location intelligence report PDF."""
    return generate_pdf(
        title=f"PinAI Location Report — {pincode}",
        sections=[
            {"heading": "Location Details", "content": [
                f"Office: {location.get('office', 'N/A')}",
                f"District: {location.get('district', 'N/A')}",
                f"State: {location.get('state', 'N/A')}",
                f"Division: {location.get('division', 'N/A')}",
            ]},
            {"heading": "Business Signals", "content": [
                f"Market Density Score: {metrics.get('market_density_score', 'N/A')} / 10",
                f"Delivery Active: {'Yes' if metrics.get('delivery_active') else 'No'}",
                f"Population Proxy: {metrics.get('population_proxy_enrolments', 'N/A')}",
            ]},
            {"heading": "AI Recommendation", "content": insight},
        ],
        metadata={"Pincode": pincode, "Report Type": "Location Intelligence"},
        app_id="pinai",
    )


def generate_dispute_summary(
    dispute_id: str,
    parties: str,
    description: str,
    ai_analysis: str,
) -> bytes:
    """Generate a VaadVivaad dispute summary PDF."""
    return generate_pdf(
        title=f"Dispute Summary — {dispute_id[:12]}",
        sections=[
            {"heading": "Dispute Details", "content": [
                f"Dispute ID: {dispute_id}",
                f"Parties: {parties}",
            ]},
            {"heading": "Description", "content": description},
            {"heading": "AI Mediation Analysis", "content": ai_analysis},
            {"heading": "Disclaimer", "content":
                "This is an AI-generated preliminary analysis and does not constitute legal advice. "
                "For formal mediation, contact your nearest MSME facilitation council."},
        ],
        metadata={"Dispute ID": dispute_id, "Report Type": "Mediation Summary"},
        app_id="vaadvivaad",
    )
