import os
import sys
import unittest

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

# Add workspace and kisan-voice-ai directories to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "kisan-voice-ai")))

from app.rag import get_model, get_collection, search_kcc, get_best_answer


class TestKisanRAG(unittest.TestCase):

    def test_model_loading(self):
        """Verify the sentence transformer model loads correctly."""
        model = get_model()
        self.assertIsNotNone(model)
        self.assertEqual(model.get_max_seq_length(), 256)

    def test_chroma_collection(self):
        """Verify that ChromaDB persistent client can read the collection."""
        collection = get_collection()
        self.assertIsNotNone(collection)
        self.assertTrue(collection.count() >= 0)
        print(f"ChromaDB collection loaded. Document count: {collection.count()}")

    def test_rag_querying(self):
        """Verify RAG search functions correctly and computes confidence scores."""
        # Query with general crop query
        results = search_kcc("धान में पीलापन", n_results=2)
        self.assertIsNotNone(results)
        
        if results:
            first = results[0]
            self.assertIn("question", first)
            self.assertIn("answer", first)
            self.assertIn("confidence", first)
            self.assertTrue(0.0 <= first["confidence"] <= 1.0)
            print(f"Top query match question: {first['question']}")
            print(f"Top query match confidence: {first['confidence']}")

    def test_confidence_score_boundaries(self):
        """Verify low-confidence queries default to standard helpline message."""
        # A gibberish query that shouldn't match any crop query with high confidence
        answer = get_best_answer("xyzabc123randomtextgiberishquery")
        # Should return the default helpline message because confidence is below 0.15
        self.assertIn("सटीक उत्तर नहीं मिला", answer)
        self.assertIn("1800-180-1551", answer)
        print("Fallback message returned successfully for low-confidence query.")


if __name__ == "__main__":
    unittest.main()
