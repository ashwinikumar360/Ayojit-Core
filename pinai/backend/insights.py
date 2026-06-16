import os
import sys
import json
import logging
import httpx
from pinai.backend.analyzer import PincodeAnalyzer

# Add parent workspace path for core modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from core.compliance import log_compliance_event
from core.asset_registry import verify_and_resolve_asset
from core.auth import supabase
from core.language_services import run_local_llm

logger = logging.getLogger("pinai.insights")
analyzer = PincodeAnalyzer()

# Self-hosted Sarvam-2B inference endpoint (HF Space or local GPU)
SARVAM_INFERENCE_URL = os.getenv("SARVAM_INFERENCE_URL", "")


def generate_business_insight(pincode: str, business_type: str = "retail") -> str:
    """
    Generate actionable business insight using Sarvam-2B (Apache-2.0) for natural language,
    with local template engine as offline fallback.
    """
    # 1. Audit and compliance log for the census dataset
    log_compliance_event(
        app_id="pinai",
        action="generate_insight",
        asset_id="data.gov.in/pincode",
        db=supabase
    )

    metrics = analyzer.get_business_metrics(pincode)
    if not metrics or "pincode" not in metrics:
        return f"Could not find demographic data for pincode {pincode}."

    # 2. Attempt Sarvam-2B inference for richer, natural-language insights
    sarvam_asset = _verify_sarvam()
    if SARVAM_INFERENCE_URL and sarvam_asset:
        try:
            result = _sarvam_insight(metrics, business_type)
            if result:
                log_compliance_event(
                    app_id="pinai",
                    action="sarvam_2b_inference",
                    asset_id="sarvamai/sarvam-2b-v0.5",
                    db=supabase
                )
                return result
        except Exception as e:
            logger.warning(f"Sarvam-2B insight generation failed: {str(e)}")

    # Standalone free alternative: Call OpenRouter free tier models if API key is configured
    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    if openrouter_key:
        try:
            logger.info("Calling OpenRouter free tier model for business insight...")
            result = _openrouter_insight(metrics, business_type, openrouter_key)
            if result:
                log_compliance_event(
                    app_id="pinai",
                    action="openrouter_insight",
                    asset_id="sarvamai/sarvam-2b-v0.5",
                    db=supabase
                )
                return result
        except Exception as e:
            logger.error(f"OpenRouter free business insight failed: {str(e)}")

    # 3. Offline fallback: template-based insight generation (completely bypassing local model load for zero host CPU load)
    if not SARVAM_INFERENCE_URL and not openrouter_key:
        logger.info("Using local template engine for business insight (offline fallback).")
        return _template_insight(metrics, business_type)


def generate_expansion_report(current_pincode: str, candidate_pincodes: list[str]) -> str:
    """
    Generate expansion comparison report using Sarvam-2B with template fallback.
    """
    # 1. Audit and compliance log
    log_compliance_event(
        app_id="pinai",
        action="generate_expansion",
        asset_id="data.gov.in/pincode",
        db=supabase
    )

    comparisons = analyzer.compare_pincodes([current_pincode] + candidate_pincodes)
    if not comparisons:
        return "Could not retrieve expansion comparison metrics."

    candidates = comparisons[1:]  # exclude current
    if not candidates:
        return "No candidate pincodes provided for expansion analysis."

    # 2. Attempt Sarvam-2B for richer report
    sarvam_asset = _verify_sarvam()
    if SARVAM_INFERENCE_URL and sarvam_asset:
        try:
            result = _sarvam_expansion(comparisons, current_pincode, candidate_pincodes)
            if result:
                log_compliance_event(
                    app_id="pinai",
                    action="sarvam_2b_inference",
                    asset_id="sarvamai/sarvam-2b-v0.5",
                    db=supabase
                )
                return result
        except Exception as e:
            logger.warning(f"Sarvam-2B expansion report failed: {str(e)}")

    # Standalone free alternative: Call OpenRouter free tier models if API key is configured
    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    if openrouter_key:
        try:
            logger.info("Calling OpenRouter free tier model for expansion report...")
            result = _openrouter_expansion(comparisons, current_pincode, candidate_pincodes, openrouter_key)
            if result:
                log_compliance_event(
                    app_id="pinai",
                    action="openrouter_expansion",
                    asset_id="sarvamai/sarvam-2b-v0.5",
                    db=supabase
                )
                return result
        except Exception as e:
            logger.error(f"OpenRouter free expansion report failed: {str(e)}")

    # 3. Template fallback (completely bypassing local model load for zero host CPU load)
    if not SARVAM_INFERENCE_URL and not openrouter_key:
        logger.info("Using local template engine for expansion report (offline fallback).")
        return _template_expansion(comparisons, candidate_pincodes)


# ==============================================================================
# Sarvam-2B Inference Helpers
# ==============================================================================

def _verify_sarvam():
    """Verify Sarvam-2B in asset registry. Returns asset dict or None."""
    try:
        return verify_and_resolve_asset("sarvamai/sarvam-2b-v0.5", supabase)
    except Exception as e:
        logger.warning(f"Sarvam-2B registry check failed: {str(e)}")
        return None


def _run_async(coro):
    import asyncio
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


def _sarvam_insight(metrics: dict, business_type: str) -> str:
    """Call Sarvam-2B for business insight generation."""
    signals = metrics["business_signals"]
    loc = metrics["location"]

    prompt = (
        f"You are PinAI, a hyperlocal business intelligence assistant for India.\n"
        f"Analyze the following market data and generate a concise business insight "
        f"for a {business_type} business.\n\n"
        f"Location: {loc['office']}, {loc['district']}, {loc['state']}\n"
        f"Population proxy (enrolments): {signals.get('population_proxy_enrolments', 'unknown')}\n"
        f"Market density score (0-10): {signals.get('market_density_score', 'unknown')}\n"
        f"Delivery status: {'Active' if signals.get('delivery_active') else 'Inactive'}\n"
        f"Catchment area: {signals.get('estimated_catchment_area', 'unknown')} sq km\n"
        f"Nearby commercial points (10km): {signals.get('nearby_pincodes_10km', 'unknown')}\n\n"
        f"Provide 2-3 sentences covering: market potential, competition level, and one actionable recommendation."
    )

    return _run_async(_call_sarvam(prompt))


def _sarvam_expansion(comparisons: list, current_pincode: str, candidate_pincodes: list[str]) -> str:
    """Call Sarvam-2B for expansion comparison report."""
    metrics_summary = []
    for c in comparisons:
        s = c["business_signals"]
        l = c["location"]
        metrics_summary.append(
            f"- {c['pincode']} ({l['office']}, {l['district']}): "
            f"Pop={s['population_proxy_enrolments']}, Density={s['market_density_score']}/10"
        )

    prompt = (
        f"You are PinAI, a hyperlocal business intelligence assistant.\n"
        f"Compare these expansion candidates against the current location {current_pincode}:\n\n"
        f"{'chr(10)'.join(metrics_summary)}\n\n"
        f"Recommend the best expansion zone and explain why in 2-3 sentences."
    )

    return _run_async(_call_sarvam(prompt))


async def _call_sarvam(prompt: str) -> str:
    """Low-level Sarvam-2B inference call."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        hf_headers = {}
        hf_token = os.getenv("HF_TOKEN")
        if hf_token:
            hf_headers["Authorization"] = f"Bearer {hf_token}"

        resp = await client.post(
            f"{SARVAM_INFERENCE_URL}/generate",
            json={
                "prompt": prompt,
                "max_new_tokens": 512,
                "temperature": 0.4,
            },
            headers=hf_headers
        )

        if resp.status_code != 200:
            logger.error(f"Sarvam-2B returned status {resp.status_code}: {resp.text}")
            return ""

        return resp.json().get("generated_text", "").strip()


def _openrouter_insight(metrics: dict, business_type: str, api_key: str) -> str:
    """Call OpenRouter always-free google/gemma-2-9b-it:free model for business insight generation."""
    signals = metrics["business_signals"]
    loc = metrics["location"]

    prompt = (
        f"You are PinAI, a hyperlocal business intelligence assistant for India.\n"
        f"Analyze the following market data and generate a concise business insight "
        f"for a {business_type} business.\n\n"
        f"Location: {loc['office']}, {loc['district']}, {loc['state']}\n"
        f"Population proxy (enrolments): {signals.get('population_proxy_enrolments', 'unknown')}\n"
        f"Market density score (0-10): {signals.get('market_density_score', 'unknown')}\n"
        f"Delivery status: {'Active' if signals.get('delivery_active') else 'Inactive'}\n"
        f"Catchment area: {signals.get('estimated_catchment_area', 'unknown')} sq km\n"
        f"Nearby commercial points (10km): {signals.get('nearby_pincodes_10km', 'unknown')}\n\n"
        f"Provide 2-3 sentences covering: market potential, competition level, and one actionable recommendation."
    )

    return _run_async(_call_openrouter(prompt, api_key))


def _openrouter_expansion(comparisons: list, current_pincode: str, candidate_pincodes: list[str], api_key: str) -> str:
    """Call OpenRouter always-free google/gemma-2-9b-it:free model for expansion comparison report."""
    metrics_summary = []
    for c in comparisons:
        s = c["business_signals"]
        l = c["location"]
        metrics_summary.append(
            f"- {c['pincode']} ({l['office']}, {l['district']}): "
            f"Pop={s['population_proxy_enrolments']}, Density={s['market_density_score']}/10"
        )

    summary_lines = "\n".join(metrics_summary)
    prompt = (
        f"You are PinAI, a hyperlocal business intelligence assistant.\n"
        f"Compare these expansion candidates against the current location {current_pincode}:\n\n"
        f"{summary_lines}\n\n"
        f"Recommend the best expansion zone and explain why in 2-3 sentences."
    )

    return _run_async(_call_openrouter(prompt, api_key))


async def _call_openrouter(prompt: str, api_key: str) -> str:
    """Low-level OpenRouter always-free model inference call."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            json={
                "model": "google/gemma-2-9b-it:free",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.4,
            },
            headers={"Authorization": f"Bearer {api_key}"}
        )

        if resp.status_code != 200:
            logger.error(f"OpenRouter returned status {resp.status_code}: {resp.text}")
            return ""

        resp_data = resp.json()
        return resp_data["choices"][0]["message"]["content"].strip()


# ==============================================================================
# Template-Based Fallback Engines
# ==============================================================================

def _template_insight(metrics: dict, business_type: str) -> str:
    """Local template-based insight generator (no external API dependency)."""
    signals = metrics["business_signals"]
    loc = metrics["location"]

    pop_proxy = signals.get("population_proxy_enrolments", 10000)
    density = signals.get("market_density_score", 5)
    delivery = "Active" if signals.get("delivery_active", False) else "Inactive"
    catchment = signals.get("estimated_catchment_area", 20)
    nearby = signals.get("nearby_pincodes_10km", 3)

    # Dynamic generation based on metrics
    pot_str = "strong" if pop_proxy > 40000 else "moderate" if pop_proxy > 15000 else "developing"
    comp_str = "highly saturated" if density >= 7 else "steadily growing" if density >= 4 else "untapped and nascent"
    del_advice = "leverage existing delivery services" if delivery == "Active" else "establish localized delivery channels"

    s1 = f"The market potential for a {business_type} business in {loc['office']} ({loc['district']}, {loc['state']}) is {pot_str} with a local population catchment of approximately {pop_proxy:,} registered residents."
    s2 = f"Competition density in this pincode is scored at {density}/10, indicating a {comp_str} market with {nearby} active post/commercial points within a 10km radius."
    s3 = f"Recommendation: Capture the {catchment} sq km business trade zone by establishing a storefront near major post routes and ensure you {del_advice}."

    return f"{s1} {s2} {s3}"


def _template_expansion(comparisons: list, candidate_pincodes: list[str]) -> str:
    """Local template-based expansion report (no external API dependency)."""
    candidates = comparisons[1:]  # exclude current
    if not candidates:
        return "No candidate pincodes provided for expansion analysis."

    best = max(candidates, key=lambda c: c["business_signals"]["population_proxy_enrolments"] * (10 - c["business_signals"]["market_density_score"]))

    c_pin = best["pincode"]
    c_loc = best["location"]
    c_pop = best["business_signals"]["population_proxy_enrolments"]
    c_dens = best["business_signals"]["market_density_score"]

    r1 = f"Expansion candidates comparison: Out of the candidate zones {', '.join(candidate_pincodes)}, Pincode {c_pin} ({c_loc['office']}, {c_loc['district']}) represents the most viable retail expansion zone."
    r2 = f"This location offers a high density ratio with a population proxy of {c_pop:,} residents and a balanced commercial market density score of {c_dens}/10, minimizing market saturation risks."

    return f"{r1} {r2}"
