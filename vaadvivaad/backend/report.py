import os
import io
import logging
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from vaadvivaad.backend.dispute import get_dispute

logger = logging.getLogger("vaadvivaad.report")


def generate_dispute_pdf(dispute_id: str) -> Optional[bytes]:
    """
    Generates a clean, professional PDF file representation 
    of the AI Mediation Order and returns the raw file bytes.
    """
    dispute = get_dispute(dispute_id)
    if not dispute or not dispute.get("resolution"):
        logger.warning(f"Attempted to print PDF for unresolved dispute: {dispute_id}")
        return None

    try:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        
        # Custom styles for Neo-Brutalism aligned layout
        title_style = ParagraphStyle(
            name='DocTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#000000'),
            spaceAfter=12,
            alignment=1  # Centered
        )

        section_style = ParagraphStyle(
            name='SecTitle',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=13,
            leading=16,
            textColor=colors.HexColor('#111827'),
            spaceBefore=14,
            spaceAfter=6,
            borderWidth=1,
            borderColor=colors.black
        )

        body_style = ParagraphStyle(
            name='BodyBold',
            parent=styles['BodyText'],
            fontName='Helvetica',
            fontSize=10,
            leading=13,
            textColor=colors.HexColor('#374151'),
            spaceAfter=8
        )

        story = []

        # 1. Header Banner
        story.append(Paragraph("VAADVIVAAD AI MEDIATION RESOLUTION ORDER", title_style))
        story.append(Spacer(1, 12))

        # 2. Key Metadata Table
        data = [
            [Paragraph("<b>Dispute ID:</b>", body_style), Paragraph(dispute["id"], body_style)],
            [Paragraph("<b>Mediation Date:</b>", body_style), Paragraph(dispute.get("resolved_at", "N/A"), body_style)],
            [Paragraph("<b>Filer (Complainant):</b>", body_style), Paragraph(dispute["complainant_name"], body_style)],
            [Paragraph("<b>Respondent:</b>", body_style), Paragraph(dispute["respondent_name"], body_style)],
            [Paragraph("<b>Disputed Amount:</b>", body_style), Paragraph(f"INR {dispute['amount']:,.2f}", body_style)],
            [Paragraph("<b>Claim Category:</b>", body_style), Paragraph(dispute["dispute_type"].replace('_', ' ').upper(), body_style)]
        ]
        
        meta_table = Table(data, colWidths=[150, 350])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F9FAFB')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
            ('BOX', (0, 0), (-1, -1), 1.5, colors.black),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        story.append(meta_table)
        story.append(Spacer(1, 16))

        # 3. Complainant Statement Section
        story.append(Paragraph("COMPLAINANT ARGUMENT STATEMENT", section_style))
        story.append(Paragraph(dispute["complainant_statement"], body_style))
        story.append(Spacer(1, 10))

        # 4. Respondent Statement Section
        story.append(Paragraph("RESPONDENT DEFENSE STATEMENT", section_style))
        story.append(Paragraph(dispute.get("respondent_statement") or "No defense statement submitted.", body_style))
        story.append(Spacer(1, 10))

        # 5. AI Resolution Recommendations Section
        story.append(Paragraph("MEDIATION DECISION & SPLIT INSTRUCTIONS", section_style))
        resolution_lines = dispute["resolution"].split("\n")
        
        # Find the actual text payload between borders
        clean_text_lines = []
        for line in resolution_lines:
            if "===" not in line and "---" not in line:
                clean_text_lines.append(line.strip())
                
        clean_resolution = "<br/>".join(clean_text_lines)
        story.append(Paragraph(clean_resolution, body_style))
        story.append(Spacer(1, 20))

        # 6. Build document
        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        return pdf_bytes
    except Exception as e:
        logger.error(f"Failed to compile PDF document layout for {dispute_id}: {str(e)}")
        return None
