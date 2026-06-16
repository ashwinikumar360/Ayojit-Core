import os
import sys
import logging
import chromadb
from sentence_transformers import SentenceTransformer
from functools import lru_cache

# Add workspace path to import core registry
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from core.asset_registry import verify_and_resolve_asset
from core.compliance import log_compliance_event
from core.auth import supabase

logger = logging.getLogger("kisan.rag")

CHROMA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "chroma_kcc"))
COLLECTION_NAME = "kcc_farmer_queries"


@lru_cache(maxsize=1)
def get_model():
    """Load approved sentence transformer model (cached)."""
    model_id = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"
    # Check if local offline model exists in root directory
    local_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "models", "paraphrase-multilingual-mpnet-base-v2"))
    
    asset = verify_and_resolve_asset(model_id, supabase)
    
    if os.path.exists(local_path) and os.path.isdir(local_path):
        logger.info(f"Initializing approved SentenceTransformer model from local standalone path: {local_path}")
        return SentenceTransformer(local_path)
    
    logger.info(f"Initializing approved SentenceTransformer {model_id} model from Hugging Face (Revision: {asset['version_tag']})...")
    return SentenceTransformer(
        model_id,
        revision=asset["version_tag"]
    )


@lru_cache(maxsize=1)
def get_collection():
    """Initializes local ChromaDB client and fetches collection."""
    os.makedirs(CHROMA_DIR, exist_ok=True)
    client = chromadb.PersistentClient(path=CHROMA_DIR)
    return client.get_or_create_collection(COLLECTION_NAME)


def search_kcc(query: str, n_results: int = 3, filters: dict = None) -> list[dict]:
    """
    Search ChromaDB for matching farmer queries.
    Embeds query in English/Hindi and returns matched document Q&As.
    """
    try:
        # Verify and audit compliance for KCC dataset query
        log_compliance_event(
            app_id="kisan-voice-ai",
            action="search_kcc",
            asset_id="data.gov.in/kcc",
            db=supabase
        )
        
        model = get_model()
        collection = get_collection()
        embedding = model.encode([query]).tolist()

        where_clause = None
        if filters:
            conditions = [
                {k: {"$eq": v}} for k, v in filters.items() if v and v != "nan"
            ]
            if conditions:
                where_clause = {"$and": conditions} if len(conditions) > 1 else conditions[0]

        results = collection.query(
            query_embeddings=embedding,
            n_results=n_results,
            where=where_clause,
            include=["documents", "metadatas", "distances"],
        )

        answers = []
        if results and "documents" in results and len(results["documents"]) > 0:
            for i, doc in enumerate(results["documents"][0]):
                distance = results["distances"][0][i]
                confidence = max(0.0, 1.0 - distance)
                meta = results["metadatas"][0][i]
                answers.append(
                    {
                        "question": doc,
                        "answer": meta.get("answer", ""),
                        "crop": meta.get("crop", ""),
                        "district": meta.get("district", ""),
                        "confidence": round(confidence, 3),
                    }
                )
        return answers
    except Exception as e:
        logger.error(f"ChromaDB search operation failed: {str(e)}")
        return []


def get_best_answer(query: str, crop: str = None) -> str:
    """Returns the top confidence matched answer from KCC transcripts."""
    filters = {"crop": crop} if crop else None
    results = search_kcc(query, n_results=1, filters=filters)
    
    if not results:
        return "इस प्रश्न का उत्तर हमारे डेटाबेस में नहीं मिला। कृपया सरकारी किसान हेल्पलाइन 1800-180-1551 पर संपर्क करें।"
    
    best = results[0]
    if best["confidence"] < 0.15:
        logger.warning(f"Low confidence match ({best['confidence']}) for query: {query}")
        return "इस प्रश्न का सटीक उत्तर नहीं मिला। कृपया सरकारी किसान हेल्पलाइन 1800-180-1551 पर संपर्क करें।"
        
    return best["answer"]
