import os
import sys
import unittest
from unittest.mock import patch, MagicMock, AsyncMock
from PIL import Image
import io

# Setup basic logging to see details
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("verify.docpatram")

# Append workspace and app paths
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "docpatram")))

# Make sure we run in offline mock mode without errors
os.environ["SUPABASE_URL"] = ""
os.environ["SUPABASE_SERVICE_KEY"] = ""
os.environ["PATRAM_HF_SPACE_URL"] = "http://mock-patram-vlm"

from fastapi.testclient import TestClient
from docpatram.backend.main import app
import docpatram.backend.main

class TestDocPatramAlignment(unittest.TestCase):
    def setUp(self):
        self.logged_events = []
        
        # Spy on log_compliance_event inside the main.py module to catch the local reference
        self.original_log_compliance = docpatram.backend.main.log_compliance_event
        
        def spy_log_compliance_event(app_id, action, asset_id, user_id=None, db=None):
            self.logged_events.append({
                "app_id": app_id,
                "action": action,
                "asset_id": asset_id
            })
            return self.original_log_compliance(app_id, action, asset_id, user_id, db)
            
        docpatram.backend.main.log_compliance_event = spy_log_compliance_event

        # Override get_current_user dependency
        from core.auth import get_current_user
        async def mock_get_current_user():
            return {"user_id": "test-user-id", "email": "test@example.com"}
            
        app.dependency_overrides[get_current_user] = mock_get_current_user
        self.client = TestClient(app)
        
        # Generate valid image bytes
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        self.valid_image_bytes = img_bytes.getvalue()

    def tearDown(self):
        docpatram.backend.main.log_compliance_event = self.original_log_compliance
        app.dependency_overrides.clear()

    @patch("docpatram.backend.main.upload_base64_image")
    @patch("httpx.AsyncClient.post")
    def test_extract_english_only_logs_template(self, mock_post, mock_upload):
        # Mock HTTPX VLM call
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"extracted_text": "English text"}
        mock_post.return_value = mock_resp
        
        mock_upload.return_value = "https://cloudinary.com/mock"

        # Send request with english language
        response = self.client.post(
            "/extract",
            headers={"Authorization": "Bearer mock-token"},
            files={"file": ("test.jpg", self.valid_image_bytes, "image/jpeg")},
            data={"document_type": "general", "language": "english", "anonymize": "false"}
        )
        
        if response.status_code != 200:
            logger.error(f"Response status: {response.status_code}, body: {response.text}")
        self.assertEqual(response.status_code, 200)
        
        # Check logged compliance assets
        asset_ids = [event["asset_id"] for event in self.logged_events]
        self.assertIn("data.gov.in/public_templates", asset_ids)
        self.assertNotIn("IndicTrans2", asset_ids)
        logger.info("English language request successfully verified: Only public_templates logged.")

    @patch("docpatram.backend.main.upload_base64_image")
    @patch("httpx.AsyncClient.post")
    def test_extract_regional_logs_both(self, mock_post, mock_upload):
        # Mock HTTPX VLM call
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"extracted_text": "Regional text"}
        mock_post.return_value = mock_resp
        
        mock_upload.return_value = "https://cloudinary.com/mock"

        # Send request with hindi language
        response = self.client.post(
            "/extract",
            headers={"Authorization": "Bearer mock-token"},
            files={"file": ("test.jpg", self.valid_image_bytes, "image/jpeg")},
            data={"document_type": "general", "language": "hindi", "anonymize": "false"}
        )
        
        if response.status_code != 200:
            logger.error(f"Response status: {response.status_code}, body: {response.text}")
        self.assertEqual(response.status_code, 200)
        
        # Check logged compliance assets
        asset_ids = [event["asset_id"] for event in self.logged_events]
        self.assertIn("data.gov.in/public_templates", asset_ids)
        self.assertIn("IndicTrans2", asset_ids)
        logger.info("Regional language request successfully verified: public_templates and IndicTrans2 both logged.")

if __name__ == "__main__":
    unittest.main()
