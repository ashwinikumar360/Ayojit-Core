import logging
from vaadvivaad.backend.sarvam import analyze_dispute
from vaadvivaad.backend.dispute import get_dispute, save_ai_analysis

logger = logging.getLogger("vaadvivaad.resolution")


async def run_mediation(dispute_id: str) -> dict:
    """Coordinates mediation run: fetches statements, runs model queries, formats response."""
    dispute = get_dispute(dispute_id)
    if not dispute:
        return {"error": "Dispute details not found"}

    if not dispute.get("respondent_statement"):
        return {"error": "Waiting for respondent statement input"}

    logger.info(f"Initiating dispute mediation analysis for ID: {dispute_id}")
    try:
        analysis = await analyze_dispute(
            complainant_statement=dispute["complainant_statement"],
            respondent_statement=dispute["respondent_statement"],
            dispute_type=dispute["dispute_type"],
            amount=dispute["amount"],
            language=dispute.get("language", "hi")
        )
        
        resolution_text = _format_resolution_text(analysis, dispute)
        save_ai_analysis(dispute_id, analysis, resolution_text)
        
        logger.info(f"Dispute mediation resolved for ID: {dispute_id}")
        return {
            "dispute_id": dispute_id,
            "analysis": analysis,
            "resolution": resolution_text,
            "status": "resolved"
        }
    except Exception as e:
        logger.error(f"Mediation runner failed for dispute {dispute_id}: {str(e)}")
        return {"error": f"Mediation evaluation failed: {str(e)}"}


def _format_resolution_text(analysis: dict, dispute: dict) -> str:
    """Outputs a clean, structured text report of the AI mediation decision."""
    res = analysis.get("resolution", {})
    res_type = res.get("type", "unclear")
    amount = res.get("amount", 0)
    details = res.get("details", "")

    lines = [
        "==================================================",
        "          VAADVIVAAD AI MEDIATION ORDER           ",
        "==================================================",
        f"Dispute Transaction ID: {dispute['id']}",
        f"Mediation Date: {dispute.get('resolved_at', 'Pending Evaluation')}",
        "",
        "PARTIES TO DISPUTE:",
        f"  - Complainant (Filer): {dispute['complainant_name']}",
        f"  - Respondent (Defender): {dispute['respondent_name']}",
        "",
        "DISPUTE BACKGROUND DETAILS:",
        f"  - Claim Classification: {dispute['dispute_type'].replace('_', ' ').upper()}",
        f"  - Disputed Amount: INR {dispute['amount']:,.2f}",
        "",
        "AI ANALYTICAL SUMMARY EVALUATION:",
        f"  {analysis.get('analysis', '')}",
        "",
        "LAWSUIT RATIONALE & CASE ASSESSMENT:",
        f"  Claim Balance: {analysis.get('stronger_claim', 'unclear').upper()}",
        f"  Reasoning: {analysis.get('reasoning', '')}",
        "",
        "RECOMMENDED RESOLUTION SPLIT ORDER:",
        f"  - Action Target: {res_type.replace('_', ' ').upper()}",
        f"  - Target Settlement Amount: INR {amount:,.2f}",
        f"  - Action Specifications: {details}",
        "",
        "--------------------------------------------------",
        "Disclaimer: This resolution order is compiled using",
        "Sarvam-2B (Apache-2.0) AI reasoning with rule-based",
        "legal analysis fallback. It acts as a mediated",
        "recommendation, not a binding legal judgement.",
        "Both parties must mutually sign off.",
        "=================================================="
    ]
    return "\n".join(lines)
