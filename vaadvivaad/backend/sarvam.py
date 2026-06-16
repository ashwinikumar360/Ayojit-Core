import os
import sys
import json
import logging
import httpx
from typing import Dict, Any

# Add parent workspace path for core modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from core.compliance import log_compliance_event
from core.asset_registry import verify_and_resolve_asset
from core.auth import supabase
from core.language_services import run_local_llm

logger = logging.getLogger("vaadvivaad.mediator")

# Self-hosted Sarvam-2B inference endpoint (HF Space or local GPU)
SARVAM_INFERENCE_URL = os.getenv("SARVAM_INFERENCE_URL", "")


async def analyze_dispute(
    complainant_statement: str,
    respondent_statement: str,
    dispute_type: str,
    amount: float,
    language: str = "hi",
) -> Dict[str, Any]:
    """
    Evaluate MSME business dispute using Sarvam-2B (Apache-2.0) for reasoning,
    with a local rule-based engine as offline fallback.
    """
    # 1. Verify Sarvam-2B in the Asset Registry
    try:
        resolved_asset = verify_and_resolve_asset("sarvamai/sarvam-2b-v0.5", supabase)
        logger.info(f"Using approved model: {resolved_asset['name']} ({resolved_asset['license_type']})")
    except Exception as e:
        logger.warning(f"Sarvam-2B registry check failed: {str(e)}. Using rule-based fallback.")
        resolved_asset = None

    # 2. Audit and compliance log for public legal texts
    log_compliance_event(
        app_id="vaadvivaad",
        action="analyze_dispute",
        asset_id="data.gov.in/legal_judgments",
        db=supabase
    )

    # 3. Attempt Sarvam-2B inference if server is configured and asset is approved
    if SARVAM_INFERENCE_URL and resolved_asset:
        try:
            result = await _sarvam_inference(
                complainant_statement, respondent_statement,
                dispute_type, amount, language
            )
            if result:
                # Log model usage for compliance
                log_compliance_event(
                    app_id="vaadvivaad",
                    action="sarvam_2b_inference",
                    asset_id="sarvamai/sarvam-2b-v0.5",
                    db=supabase
                )
                return result
        except Exception as e:
            logger.warning(f"Sarvam-2B inference failed: {str(e)}")

    # Standalone free alternative: Call OpenRouter free tier models if API key is configured
    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    if openrouter_key:
        try:
            logger.info("Calling OpenRouter free tier model for dispute analysis...")
            result = await _openrouter_dispute_inference(
                complainant_statement, respondent_statement,
                dispute_type, amount, openrouter_key
            )
            if result:
                log_compliance_event(
                    app_id="vaadvivaad",
                    action="openrouter_inference",
                    asset_id="sarvamai/sarvam-2b-v0.5",
                    db=supabase
                )
                return result
        except Exception as e:
            logger.error(f"OpenRouter free dispute analysis failed: {str(e)}")

    # 4. Offline fallback: rule-based analysis engine (completely bypassing local model load for zero host CPU load)
    if not SARVAM_INFERENCE_URL and not openrouter_key:
        logger.info("Using local rule-based dispute analysis engine (offline fallback).")
        return _rule_based_analysis(
            complainant_statement, respondent_statement,
            dispute_type, amount
        )


async def _sarvam_inference(
    complainant_statement: str,
    respondent_statement: str,
    dispute_type: str,
    amount: float,
    language: str,
) -> Dict[str, Any]:
    """
    Call self-hosted Sarvam-2B model for dispute analysis.
    Sends structured prompt, expects JSON-structured response.
    """
    system_prompt = (
        "You are VaadVivaad, an AI mediator for Indian MSME trade disputes. "
        "Analyze the dispute using Indian Contract Act 1872 and MSME Development Act 2006. "
        "Respond ONLY with a valid JSON object containing: "
        "analysis (string), stronger_claim (complainant/respondent/unclear), "
        "reasoning (string), resolution (object with type, amount, details), "
        "and confidence (High/Medium/Low)."
    )

    user_prompt = (
        f"Dispute Type: {dispute_type}\n"
        f"Disputed Amount: INR {amount:,.2f}\n\n"
        f"Complainant Statement:\n{complainant_statement}\n\n"
        f"Respondent Statement:\n{respondent_statement}\n\n"
        f"Analyze this dispute and provide a structured mediation recommendation."
    )

    async with httpx.AsyncClient(timeout=60.0) as client:
        hf_headers = {}
        hf_token = os.getenv("HF_TOKEN")
        if hf_token:
            hf_headers["Authorization"] = f"Bearer {hf_token}"

        resp = await client.post(
            f"{SARVAM_INFERENCE_URL}/generate",
            json={
                "system_prompt": system_prompt,
                "prompt": user_prompt,
                "max_new_tokens": 1024,
                "temperature": 0.3,
            },
            headers=hf_headers
        )

        if resp.status_code != 200:
            logger.error(f"Sarvam-2B inference returned status {resp.status_code}: {resp.text}")
            return None

        resp_data = resp.json()
        generated_text = resp_data.get("generated_text", "")

        # Parse JSON from model output
        try:
            # Try to extract JSON from the response (model may wrap it in markdown)
            json_start = generated_text.find("{")
            json_end = generated_text.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                result = json.loads(generated_text[json_start:json_end])
                # Validate required fields exist
                required = ["analysis", "stronger_claim", "reasoning", "resolution", "confidence"]
                if all(k in result for k in required):
                    return result
                else:
                    logger.warning(f"Sarvam-2B response missing required fields: {result.keys()}")
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse Sarvam-2B JSON output: {str(e)}")

        return None


def _rule_based_analysis(
    complainant_statement: str,
    respondent_statement: str,
    dispute_type: str,
    amount: float,
) -> Dict[str, Any]:
    """
    Offline rule-based dispute analysis using Indian Trade & Contract Act rules.
    Used as fallback when Sarvam-2B inference is unavailable.
    """
    c_text = complainant_statement.lower()
    r_text = respondent_statement.lower()

    # Rule-based analysis parsing keywords
    stronger_claim = "unclear"
    resolution_type = "partial_refund"
    recommended_amount = amount * 0.5
    confidence = "Medium"
    details = ""

    # Check for delayed payment keyword indicators
    is_payment = any(w in c_text or w in r_text for w in ["payment", "pay", "invoice", "unpaid", "delay", "due", "outstanding"])
    is_delivery = any(w in c_text or w in r_text for w in ["delivery", "not received", "transit", "shipping", "shipped"])
    is_quality = any(w in c_text or w in r_text for w in ["damage", "defect", "broken", "quality", "inferior", "specification"])

    if is_payment:
        # Under Section 15/16 of the Indian MSME Development Act 2006, delayed payment requires interest
        if "paid" in r_text or "sent" in r_text:
            stronger_claim = "unclear"
            resolution_type = "partial_refund"
            recommended_amount = amount * 0.5
            details = "Respondent claims payment was dispatched, but Complainant records no receipt. Recommended 50% escrow settlement."
            confidence = "Medium"
        else:
            stronger_claim = "complainant"
            resolution_type = "full_refund"
            recommended_amount = amount
            details = "Uncontested unpaid invoice. Under MSMED Act 2006 Section 16, interest split or full invoice value must be settled."
            confidence = "High"
    elif is_delivery:
        if "delivered" in r_text or "proof" in r_text or "pod" in r_text:
            stronger_claim = "respondent"
            resolution_type = "no_refund"
            recommended_amount = 0.0
            details = "Respondent provided proof of delivery/carriage details. Claim rejected unless complainant proves damage in transit."
            confidence = "High"
        else:
            stronger_claim = "complainant"
            resolution_type = "full_refund"
            recommended_amount = amount
            details = "Non-delivery established with no carriage validation from respondent. Full refund recommended."
            confidence = "High"
    elif is_quality:
        stronger_claim = "complainant"
        resolution_type = "partial_refund"
        recommended_amount = amount * 0.7
        details = "Quality deviation reported. Recommended 30% discount write-down with 70% invoice payment settlement."
        confidence = "Medium"
    else:
        details = "Generic trade grievance. Recommended balanced split settlement."

    analysis = (
        f"Evaluation of {dispute_type} trade dispute valued at INR {amount:,.2f}. "
        f"Key claim dimensions: Payment={is_payment}, Delivery={is_delivery}, Quality={is_quality}."
    )

    reasoning = (
        f"Based on local codified rules under the Indian Contract Act 1872 and the MSME Development Act 2006, "
        f"the claim is evaluated as '{stronger_claim}'. "
        f"A resolution split of {resolution_type} is suggested to avoid court escalation."
    )

    return {
        "analysis": analysis,
        "stronger_claim": stronger_claim,
        "reasoning": reasoning,
        "resolution": {
            "type": resolution_type,
            "amount": recommended_amount,
            "details": details
        },
        "confidence": confidence
    }


async def _openrouter_dispute_inference(
    complainant_statement: str,
    respondent_statement: str,
    dispute_type: str,
    amount: float,
    api_key: str,
) -> Optional[Dict[str, Any]]:
    """
    Call OpenRouter always-free google/gemma-2-9b-it:free model for dispute analysis.
    Sends structured prompt, expects JSON-structured response.
    """
    system_prompt = (
        "You are VaadVivaad, an AI mediator for Indian MSME trade disputes. "
        "Analyze the dispute using Indian Contract Act 1872 and MSME Development Act 2006. "
        "Respond ONLY with a valid JSON object containing: "
        "analysis (string), stronger_claim (complainant/respondent/unclear), "
        "reasoning (string), resolution (object with type, amount, details), "
        "and confidence (High/Medium/Low)."
    )

    user_prompt = (
        f"Dispute Type: {dispute_type}\n"
        f"Disputed Amount: INR {amount:,.2f}\n\n"
        f"Complainant Statement:\n{complainant_statement}\n\n"
        f"Respondent Statement:\n{respondent_statement}\n\n"
        f"Analyze this dispute and provide a structured mediation recommendation."
    )

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            json={
                "model": "google/gemma-2-9b-it:free",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.3,
            },
            headers={"Authorization": f"Bearer {api_key}"}
        )

        if resp.status_code != 200:
            logger.error(f"OpenRouter returned status {resp.status_code}: {resp.text}")
            return None

        resp_data = resp.json()
        generated_text = resp_data["choices"][0]["message"]["content"].strip()

        # Parse JSON from model output
        try:
            json_start = generated_text.find("{")
            json_end = generated_text.rfind("}") + 1
            if json_start >= 0 and json_end > json_start:
                result = json.loads(generated_text[json_start:json_end])
                required = ["analysis", "stronger_claim", "reasoning", "resolution", "confidence"]
                if all(k in result for k in required):
                    return result
                else:
                    logger.warning(f"OpenRouter response missing required fields: {result.keys()}")
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse OpenRouter JSON output: {str(e)}")

        return None
