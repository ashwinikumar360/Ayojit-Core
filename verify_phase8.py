import os
import sys
import unittest
import json
from unittest.mock import patch, MagicMock

# Set up environment variables for mock run
os.environ["SUPABASE_URL"] = ""
os.environ["SUPABASE_SERVICE_KEY"] = ""

sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from pinai.backend.insights import generate_business_insight, generate_expansion_report
from vaadvivaad.backend.sarvam import analyze_dispute

class TestPhase8OpenRouterFallback(unittest.TestCase):
    
    @patch("httpx.AsyncClient.post")
    def test_pinai_insight_openrouter_success(self, mock_post):
        # Mock OpenRouter API response
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": "This is a mock AI business insight generated from OpenRouter for PinAI."
                }
            }]
        }
        mock_post.return_value = mock_resp
        
        with patch.dict(os.environ, {"OPENROUTER_API_KEY": "mock-key", "SARVAM_INFERENCE_URL": ""}):
            # Test generate_business_insight for 834001
            insight = generate_business_insight("834001", "retail")
            
            # Verify OpenRouter was called
            self.assertIn("mock AI business insight", insight)
            mock_post.assert_called_once()
            
            # Check the JSON payload passed to OpenRouter API
            args, kwargs = mock_post.call_args
            payload = kwargs.get("json", {})
            self.assertEqual(payload.get("model"), "google/gemma-2-9b-it:free")
            self.assertIn("PinAI", payload.get("messages", [{}])[0].get("content", ""))

    def test_vaadvivaad_dispute_openrouter_success(self):
        # We need to run the async dispute analysis inside asyncio event loop or mock it
        import asyncio
        
        mock_json_content = {
            "analysis": "This is an AI legal dispute analysis.",
            "stronger_claim": "complainant",
            "reasoning": "The contract terms clearly support the claimant.",
            "resolution": {
                "type": "full_refund",
                "amount": 10000.0,
                "details": "Refund the full amount immediately."
            },
            "confidence": "High"
        }
        
        async def mock_async_post(*args, **kwargs):
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.json.return_value = {
                "choices": [{
                    "message": {
                        "role": "assistant",
                        "content": json.dumps(mock_json_content)
                    }
                }]
            }
            return mock_resp

        with patch("httpx.AsyncClient.post", side_effect=mock_async_post) as mock_post:
            with patch.dict(os.environ, {"OPENROUTER_API_KEY": "mock-key", "SARVAM_INFERENCE_URL": ""}):
                loop = asyncio.get_event_loop()
                result = loop.run_until_complete(
                    analyze_dispute(
                        complainant_statement="The supplier defaulted on shipment.",
                        respondent_statement="We delivered but payment was delayed.",
                        dispute_type="payment_default",
                        amount=10000.0,
                        language="hi"
                    )
                )
                
                # Check parsed response fields
                self.assertEqual(result["stronger_claim"], "complainant")
                self.assertEqual(result["confidence"], "High")
                self.assertEqual(result["resolution"]["amount"], 10000.0)
                
                # Verify OpenRouter was called
                mock_post.assert_called_once()
                args, kwargs = mock_post.call_args
                payload = kwargs.get("json", {})
                self.assertEqual(payload.get("model"), "google/gemma-2-9b-it:free")

if __name__ == "__main__":
    unittest.main()
