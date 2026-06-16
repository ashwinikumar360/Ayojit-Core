import os
import sys
import hmac
import hashlib
import unittest
import asyncio
from unittest.mock import patch, MagicMock
from fastapi import HTTPException

# Ensure workspace is on path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

# Import core dependencies
from core.language_services import run_local_llm, translate_text, transcribe_speech
from core.auth import enforce_quota, FREE_LIMITS, PAID_LIMITS

class TestFreeApiStack(unittest.TestCase):

    def test_run_local_llm_missing_key(self):
        # When key is missing, it should immediately return configuration error message
        with patch.dict(os.environ, {"OPENROUTER_API_KEY": ""}):
            res = run_local_llm("Analyze this.")
            self.assertIn("OPENROUTER_API_KEY is not configured", res)

    @patch("httpx.AsyncClient.post")
    def test_run_local_llm_with_key(self, mock_post):
        # Mock OpenRouter API response
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": "This is a free AI response from OpenRouter."
                }
            }]
        }
        mock_post.return_value = mock_resp

        with patch.dict(os.environ, {"OPENROUTER_API_KEY": "mock-key"}):
            res = run_local_llm("Hello AI!")
            self.assertEqual(res, "This is a free AI response from OpenRouter.")
            mock_post.assert_called_once()
            
            # Check model name is google/gemma-2-9b-it:free
            args, kwargs = mock_post.call_args
            payload = kwargs.get("json", {})
            self.assertEqual(payload.get("model"), "google/gemma-2-9b-it:free")

    def test_local_model_execution_disabled_translation(self):
        # Helsinki local loader is disabled, should return fallback text instantly
        with patch.dict(os.environ, {"OPENROUTER_API_KEY": ""}):
            res = asyncio.run(
                translate_text("crop protection", "en", "hi")
            )
            self.assertEqual(res, "crop protection")

    def test_local_model_execution_disabled_asr(self):
        # Whisper local loader is disabled, should return fallback text instantly
        with patch.dict(os.environ, {"HF_TOKEN": "", "WHISPER_URL": ""}):
            res = asyncio.run(
                transcribe_speech(b"dummy_bytes", "hi")
            )
            self.assertEqual(res, "गेहूं में पीला रतुआ रोग नियंत्रण")

    @patch("core.auth.get_plan")
    @patch("core.auth.get_today_usage")
    @patch("core.auth.get_current_user")
    def test_quota_limits_free_user(self, mock_user, mock_usage, mock_plan):
        mock_user.return_value = {"user_id": "user-free", "email": "free@test.com"}
        mock_plan.return_value = "free"
        
        # Under limit should pass
        mock_usage.return_value = FREE_LIMITS["vaadvivaad"]["dispute"] - 1
        dependency = enforce_quota("vaadvivaad", "dispute")
        res = asyncio.run(dependency(user=mock_user.return_value))
        self.assertEqual(res["user_id"], "user-free")

        # Exceeding limit should raise 429
        mock_usage.return_value = FREE_LIMITS["vaadvivaad"]["dispute"]
        with self.assertRaises(HTTPException) as context:
            asyncio.run(dependency(user=mock_user.return_value))
        self.assertEqual(context.exception.status_code, 429)
        self.assertEqual(context.exception.detail["error"], "quota_exceeded")

    @patch("core.auth.get_plan")
    @patch("core.auth.get_today_usage")
    @patch("core.auth.get_current_user")
    def test_quota_limits_paid_user(self, mock_user, mock_usage, mock_plan):
        mock_user.return_value = {"user_id": "user-premium", "email": "premium@test.com"}
        mock_plan.return_value = "paid"
        
        # Paid limits should allow more requests but enforce capped limits
        mock_usage.return_value = PAID_LIMITS["vaadvivaad"]["dispute"] - 1
        dependency = enforce_quota("vaadvivaad", "dispute")
        res = asyncio.run(dependency(user=mock_user.return_value))
        self.assertEqual(res["user_id"], "user-premium")

        # Exceeding paid limit should raise 429 to protect API thresholds
        mock_usage.return_value = PAID_LIMITS["vaadvivaad"]["dispute"]
        with self.assertRaises(HTTPException) as context:
            asyncio.run(dependency(user=mock_user.return_value))
        self.assertEqual(context.exception.status_code, 429)
        self.assertEqual(context.exception.detail["error"], "quota_exceeded")
        self.assertIn("Premium daily limit reached", context.exception.detail["message"])

    def test_dodo_base_url_resolution(self):
        from core.billing import get_dodo_base_url
        with patch.dict(os.environ, {"DODO_API_KEY": "dp_test_12345"}):
            self.assertEqual(get_dodo_base_url(), "https://test.dodopayments.com")
        with patch.dict(os.environ, {"DODO_API_KEY": "dp_live_12345"}):
            self.assertEqual(get_dodo_base_url(), "https://live.dodopayments.com")
        with patch.dict(os.environ, {"DODO_API_KEY": "live_key"}):
            self.assertEqual(get_dodo_base_url(), "https://live.dodopayments.com")
        with patch.dict(os.environ, {"DODO_API_KEY": "test_key"}):
            self.assertEqual(get_dodo_base_url(), "https://test.dodopayments.com")

    def test_verify_webhook_signature(self):
        from core.billing import verify_webhook_signature
        import base64
        
        # Setup dummy keys and data
        webhook_id = "evt_test_123"
        timestamp = "1700000000"
        payload = b'{"type": "payment.succeeded"}'
        secret = "whsec_dGVzdF9zZWNyZXQ="  # base64 for "test_secret"
        
        # Calculate valid signature
        secret_bytes = base64.b64decode("dGVzdF9zZWNyZXQ=")
        signed_content = f"{webhook_id}.{timestamp}.{payload.decode()}".encode()
        computed = hmac.new(secret_bytes, signed_content, hashlib.sha256).digest()
        valid_signature = "v1," + base64.b64encode(computed).decode()
        
        # Test success
        with patch.dict(os.environ, {"DODO_WEBHOOK_SECRET": secret}):
            # Should not raise exception
            verify_webhook_signature(payload, valid_signature, webhook_id, timestamp)
            
            # Test failure
            with self.assertRaises(HTTPException) as ctx:
                verify_webhook_signature(payload, "v1,invalid_signature", webhook_id, timestamp)
            self.assertEqual(ctx.exception.status_code, 400)

    @patch("httpx.Client.get")
    def test_verify_dodo_payment(self, mock_get):
        from vaadvivaad.backend.main import verify_dodo_payment
        
        # Mock successful payment check
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"payment_status": "succeeded"}
        mock_get.return_value = mock_resp
        
        with patch.dict(os.environ, {"DODO_API_KEY": "dp_test_key"}):
            res = verify_dodo_payment("cks_payment_123")
            self.assertTrue(res)
            
            # Mock failed status check
            mock_resp.json.return_value = {"payment_status": "failed"}
            res = verify_dodo_payment("cks_payment_123")
            self.assertFalse(res)

if __name__ == "__main__":
    unittest.main()
