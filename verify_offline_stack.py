import os
import sys
import unittest
import asyncio
from unittest.mock import patch, MagicMock

# Ensure workspace is on path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

# Set mock env variables to force offline stack
os.environ["OPENROUTER_API_KEY"] = ""
os.environ["SARVAM_INFERENCE_URL"] = ""
os.environ["HF_SPACE_URL"] = ""
os.environ["HF_TOKEN"] = ""
os.environ["SUPABASE_URL"] = ""
os.environ["SUPABASE_SERVICE_KEY"] = ""
os.environ["CLOUDINARY_URL"] = ""

from pinai.backend.insights import generate_business_insight, generate_expansion_report
from vaadvivaad.backend.sarvam import analyze_dispute
from core.language_services import translate_text, transcribe_speech
from hindidiff.backend.main import generate_offline_banner

class TestOfflineStackFallback(unittest.TestCase):

    def test_translate_text_offline_fallback(self):
        # Without OpenRouter or local Helsinki model pre-downloaded, it should fall back to original text
        res = asyncio.run(
            translate_text("hello", "en", "hi")
        )
        self.assertEqual(res, "hello")

    def test_transcribe_speech_offline_fallback(self):
        # Without Whisper endpoint or token or local weights, it should return default mock transcription
        res = asyncio.run(
            transcribe_speech(b"dummy_audio_bytes", "hi")
        )
        self.assertEqual(res, "गेहूं में पीला रतुआ रोग नियंत्रण")

    def test_pinai_insight_offline_fallback(self):
        # Should execute local template insight generator
        res = generate_business_insight("110001", "retail")
        self.assertIn("retail", res.lower())
        
        report = generate_expansion_report("110001", ["110002"])
        self.assertIn("110002", report)

    def test_vaadvivaad_dispute_offline_fallback(self):
        # Should execute local template/rule-based dispute mediator
        result = asyncio.run(
            analyze_dispute(
                complainant_statement="Supplier did not ship goods.",
                respondent_statement="Buyer paid advance late.",
                dispute_type="payment_default",
                amount=5000.0,
                language="en"
            )
        )
        self.assertIn("stronger_claim", result)
        self.assertIn("confidence", result)
        self.assertIn("resolution", result)
        self.assertEqual(result["resolution"]["amount"], 2500.0) # 50% split refund

    def test_hindidiff_pillow_generator(self):
        # Call Pillow banner generator and verify base64 output
        base64_img = generate_offline_banner(
            prompt_original="A beautiful farm in a village",
            prompt_hindi="एक गाँव में एक सुंदर खेत",
            style="nature",
            size="square"
        )
        # Check that it is a valid base64 string
        self.assertTrue(len(base64_img) > 100)
        self.assertTrue(base64_img.startswith("iVBORw0KGgo") or base64_img.startswith("/9j/"))

if __name__ == "__main__":
    unittest.main()
