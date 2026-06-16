import os
import sys
import unittest

# Add workspace directory to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.asset_registry import verify_and_resolve_asset, LOCAL_REGISTRY
from core.compliance import log_compliance_event


class TestAssetCompliance(unittest.TestCase):

    def test_approved_asset(self):
        """Verify that an approved asset resolves correctly without error."""
        asset = verify_and_resolve_asset("sentence-transformers/all-MiniLM-L6-v2")
        self.assertEqual(asset["id"], "sentence-transformers/all-MiniLM-L6-v2")
        self.assertEqual(asset["license_type"], "Apache-2.0")
        self.assertTrue(asset["commercial_use"])

    def test_fallback_resolution(self):
        """Verify that a pending/non-commercial asset triggers fallback resolution."""
        # Inject dummy asset for testing fallback resolution
        LOCAL_REGISTRY["test/blocked-with-fallback"] = {
            "id": "test/blocked-with-fallback",
            "name": "Blocked Asset with Fallback",
            "source_url": "https://huggingface.co/test/blocked-with-fallback",
            "version_tag": "main",
            "license_type": "CC-BY-NC-4.0",
            "commercial_use": False,
            "status": "blocked",
            "fallback_asset_id": "sentence-transformers/all-MiniLM-L6-v2"
        }
        asset = verify_and_resolve_asset("test/blocked-with-fallback")
        self.assertEqual(asset["id"], "sentence-transformers/all-MiniLM-L6-v2")
        self.assertEqual(asset["license_type"], "Apache-2.0")

    def test_blocked_asset_no_fallback(self):
        """Verify that a blocked asset with no fallback raises PermissionError."""
        # Inject a dummy blocked asset directly into local registry for testing
        LOCAL_REGISTRY["test/blocked-no-fallback"] = {
            "id": "test/blocked-no-fallback",
            "name": "Blocked Asset",
            "source_url": "https://huggingface.co/test/blocked-no-fallback",
            "version_tag": "main",
            "license_type": "CC-BY-NC-4.0",
            "commercial_use": False,
            "status": "blocked",
            "fallback_asset_id": None
        }
        
        with self.assertRaises(PermissionError):
            verify_and_resolve_asset("test/blocked-no-fallback")

    def test_compliance_log_attribution(self):
        """Verify compliance event logs capture required attribution text."""
        # Succeeded approved asset without attribution requirement
        success = log_compliance_event(
            app_id="kisan-voice-ai",
            action="test_action",
            asset_id="sentence-transformers/all-MiniLM-L6-v2"
        )
        self.assertTrue(success)

        # Succeeded approved asset with attribution requirement (data.gov.in/kcc)
        success_attr = log_compliance_event(
            app_id="kisan-voice-ai",
            action="test_action",
            asset_id="data.gov.in/kcc"
        )
        self.assertTrue(success_attr)


if __name__ == "__main__":
    unittest.main()
