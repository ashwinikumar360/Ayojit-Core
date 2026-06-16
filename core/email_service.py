"""
core/email_service.py — Transactional email service using Resend.

Handles welcome emails, quota warnings, payment receipts, and dispute notifications.
All emails use inline CSS with Neo-Brutalism styling to match the Ayojit brand.
"""

import os
import logging
from typing import Optional

logger = logging.getLogger("core.email_service")

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "notifications@ayojit.com")
BRAND_NAME = os.getenv("BRAND_NAME", "Ayojit Intelligence")


def _get_resend_client():
    """Lazy import and initialize Resend client."""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set. Email sending is disabled.")
        return None
    try:
        import resend
        resend.api_key = RESEND_API_KEY
        return resend
    except ImportError:
        logger.error("resend package not installed. Run: pip install resend")
        return None


def _base_template(title: str, body_html: str) -> str:
    """Wrap email body in the Neo-Brutalism styled HTML template."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F4F4F5;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#FFFFFF;border:4px solid #000000;box-shadow:8px 8px 0px 0px rgba(0,0,0,1);">
    <!-- Header -->
    <div style="background:#FCD34D;border-bottom:4px solid #000000;padding:24px 32px;">
      <h1 style="margin:0;font-size:24px;font-weight:900;text-transform:uppercase;letter-spacing:-0.5px;color:#000000;">
        {BRAND_NAME}
      </h1>
      <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#000000;">{title}</p>
    </div>
    <!-- Body -->
    <div style="padding:32px;">
      {body_html}
    </div>
    <!-- Footer -->
    <div style="background:#F4F4F5;border-top:4px solid #000000;padding:16px 32px;font-size:11px;font-family:monospace;color:#71717A;">
      Powered by open models and datasets from
      <a href="https://aikosh.indiaai.gov.in" style="color:#000;font-weight:bold;">AIKosh</a>
      (IndiaAI, MeitY, Government of India).
      <br/>
      {BRAND_NAME} is not affiliated with or endorsed by AIKosh, IndiaAI, or the Government of India.
    </div>
  </div>
</body>
</html>"""


def send_email(to: str, subject: str, html: str) -> bool:
    """Send a single email via Resend. Returns True on success."""
    client = _get_resend_client()
    if not client:
        logger.info(f"Email skipped (no client): to={to}, subject={subject}")
        return False

    try:
        client.Emails.send({
            "from": FROM_EMAIL,
            "to": [to],
            "subject": subject,
            "html": html,
        })
        logger.info(f"Email sent: to={to}, subject={subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {str(e)}")
        return False


def send_welcome_email(to: str, name: str = "Citizen"):
    """Send a welcome email after user registration."""
    body = f"""
    <h2 style="margin:0 0 16px;font-weight:900;font-size:20px;">Welcome aboard, {name}! 👋</h2>
    <p style="font-size:14px;line-height:1.6;color:#27272A;">
      You now have access to all five Ayojit apps on the free tier:
    </p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr style="border-bottom:2px solid #000;">
        <td style="padding:8px;font-weight:900;font-size:13px;">🌾 Kisan Voice AI</td>
        <td style="padding:8px;font-size:12px;color:#71717A;">Voice Q&A for farmers</td>
      </tr>
      <tr style="border-bottom:2px solid #000;">
        <td style="padding:8px;font-weight:900;font-size:13px;">📍 PinAI</td>
        <td style="padding:8px;font-size:12px;color:#71717A;">Pincode business intelligence</td>
      </tr>
      <tr style="border-bottom:2px solid #000;">
        <td style="padding:8px;font-weight:900;font-size:13px;">📄 DocPatram</td>
        <td style="padding:8px;font-size:12px;color:#71717A;">Document generation</td>
      </tr>
      <tr style="border-bottom:2px solid #000;">
        <td style="padding:8px;font-weight:900;font-size:13px;">⚖️ VaadVivaad</td>
        <td style="padding:8px;font-size:12px;color:#71717A;">Dispute mediation</td>
      </tr>
      <tr>
        <td style="padding:8px;font-weight:900;font-size:13px;">🎨 HindiDiff</td>
        <td style="padding:8px;font-size:12px;color:#71717A;">Hindi text-to-image</td>
      </tr>
    </table>
    <a href="https://ayojit-intelligence.vercel.app/dashboard"
       style="display:inline-block;background:#000;color:#FCD34D;border:3px solid #000;padding:12px 24px;font-weight:900;text-transform:uppercase;font-size:14px;text-decoration:none;box-shadow:4px 4px 0px 0px rgba(0,0,0,0.3);">
      Open Dashboard →
    </a>
    """
    html = _base_template("Welcome to Ayojit", body)
    send_email(to, f"Welcome to {BRAND_NAME}", html)


def send_quota_warning(to: str, app_name: str, used: int, limit: int):
    """Warn user when they are close to their daily quota limit."""
    pct = round((used / limit) * 100) if limit > 0 else 100
    body = f"""
    <h2 style="margin:0 0 16px;font-weight:900;font-size:20px;">Quota Alert ⚠️</h2>
    <p style="font-size:14px;line-height:1.6;color:#27272A;">
      You have used <strong>{used} of {limit}</strong> daily requests for <strong>{app_name}</strong> ({pct}% consumed).
    </p>
    <div style="background:#F87171;border:3px solid #000;padding:16px;margin:16px 0;">
      <p style="margin:0;font-weight:900;font-size:14px;color:#000;">
        Once the limit is reached, requests will be blocked until midnight UTC.
      </p>
    </div>
    <a href="https://ayojit-intelligence.vercel.app/apps/{app_name.lower().replace(' ', '-')}/billing"
       style="display:inline-block;background:#000;color:#BEF264;border:3px solid #000;padding:12px 24px;font-weight:900;text-transform:uppercase;font-size:14px;text-decoration:none;">
      Upgrade to Pro →
    </a>
    """
    html = _base_template(f"Quota Warning — {app_name}", body)
    send_email(to, f"[{BRAND_NAME}] Quota warning for {app_name}", html)


def send_payment_receipt(to: str, app_name: str, amount_inr: int, transaction_id: str):
    """Send payment confirmation receipt."""
    body = f"""
    <h2 style="margin:0 0 16px;font-weight:900;font-size:20px;">Payment Confirmed ✅</h2>
    <div style="border:3px solid #000;padding:16px;margin:16px 0;background:#BEF264;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;font-weight:900;font-size:13px;">App:</td><td style="padding:6px 0;font-size:13px;">{app_name}</td></tr>
        <tr><td style="padding:6px 0;font-weight:900;font-size:13px;">Amount:</td><td style="padding:6px 0;font-size:13px;">₹{amount_inr}</td></tr>
        <tr><td style="padding:6px 0;font-weight:900;font-size:13px;">Transaction:</td><td style="padding:6px 0;font-size:11px;font-family:monospace;">{transaction_id}</td></tr>
      </table>
    </div>
    <p style="font-size:12px;color:#71717A;line-height:1.5;">
      Your Pro plan is now active. If you have questions about billing, reply to this email.
    </p>
    """
    html = _base_template("Payment Receipt", body)
    send_email(to, f"[{BRAND_NAME}] Payment receipt — ₹{amount_inr}", html)


def send_dispute_filed(to: str, dispute_id: str, parties: str):
    """Notify user that a VaadVivaad dispute has been filed."""
    body = f"""
    <h2 style="margin:0 0 16px;font-weight:900;font-size:20px;">Dispute Filed ⚖️</h2>
    <p style="font-size:14px;line-height:1.6;color:#27272A;">
      Your dispute has been submitted for AI-assisted mediation analysis.
    </p>
    <div style="border:3px solid #000;padding:16px;margin:16px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;font-weight:900;font-size:13px;">Dispute ID:</td><td style="padding:6px 0;font-size:11px;font-family:monospace;">{dispute_id}</td></tr>
        <tr><td style="padding:6px 0;font-weight:900;font-size:13px;">Parties:</td><td style="padding:6px 0;font-size:13px;">{parties}</td></tr>
      </table>
    </div>
    <p style="font-size:12px;color:#71717A;line-height:1.5;">
      You will receive a mediation summary within 24 hours. This is an AI-generated preliminary analysis and does not constitute legal advice.
    </p>
    """
    html = _base_template("Dispute Filed", body)
    send_email(to, f"[{BRAND_NAME}] Dispute #{dispute_id[:8]} filed", html)
