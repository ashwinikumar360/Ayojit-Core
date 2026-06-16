import os
import sys
import glob
import csv
import logging
import chromadb
from sentence_transformers import SentenceTransformer

# Add parent workspace to system path to load core modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from core.asset_registry import verify_and_resolve_asset, get_asset
from core.ingestion import log_ingestion_run, calculate_sha256

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kisan.ingest")

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "kcc_raw"))
CHROMA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "chroma_kcc"))
COLLECTION_NAME = "kcc_farmer_queries"
BATCH_SIZE = 100


def load_and_build_qa_pairs() -> list[dict]:
    """Scan and parse CSV documents using built-in csv module."""
    files = glob.glob(f"{DATA_DIR}/*.csv")
    if not files:
        logger.error(f"No CSV files found in directory: {DATA_DIR}")
        raise FileNotFoundError(
            f"No Kisan Call Centre CSV files found. "
            "Please download them from https://aikosh.indiaai.gov.in "
            "and place them in: ./data/kcc_raw/"
        )
    
    qa_pairs = []
    for f in files:
        try:
            with open(f, mode="r", encoding="utf-8-sig") as csvfile:
                reader = csv.DictReader(csvfile)
                headers = reader.fieldnames or []
                
                query_col = next(
                    (c for c in headers if "query" in c.lower() or "question" in c.lower()),
                    None
                )
                answer_col = next(
                    (c for c in headers if "answer" in c.lower() or "response" in c.lower()),
                    None
                )
                
                if not query_col or not answer_col:
                    logger.error(f"Failed to map columns in {f}. Found headers: {headers}")
                    continue

                crop_col = next((c for c in headers if "crop" in c.lower()), "crop")
                district_col = next((c for c in headers if "district" in c.lower()), "district")
                state_col = next((c for c in headers if "state" in c.lower()), "state")
                season_col = next((c for c in headers if "season" in c.lower()), "season")

                count = 0
                for row in reader:
                    query = str(row.get(query_col, "")).strip()
                    answer = str(row.get(answer_col, "")).strip()
                    
                    if query and answer and query.lower() != "nan" and answer.lower() != "nan":
                        qa_pairs.append({
                            "query": query,
                            "answer": answer,
                            "crop": str(row.get(crop_col, "general")).strip(),
                            "district": str(row.get(district_col, "unknown")).strip(),
                            "state": str(row.get(state_col, "india")).strip(),
                            "season": str(row.get(season_col, "unknown")).strip(),
                        })
                        count += 1
                logger.info(f"Successfully loaded {count} rows from: {os.path.basename(f)}")
        except Exception as e:
            logger.warning(f"Could not load data file {f}: {str(e)}")
            
    logger.info(f"Extracted {len(qa_pairs)} valid Q&A query pairs.")
    return qa_pairs


def ingest_to_chromadb(qa_pairs: list[dict]):
    """Creates embeddings and loads the vector database collection."""
    model_id = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"
    
    # Verify model is approved in the Asset Registry
    model_asset = verify_and_resolve_asset(model_id)
    logger.info(f"Loading approved model: {model_asset['name']} (Version: {model_asset['version_tag']})")
    
    # Check if local offline model exists in root directory
    local_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "models", "paraphrase-multilingual-mpnet-base-v2"))
    
    if os.path.exists(local_path) and os.path.isdir(local_path):
        logger.info(f"Initializing SentenceTransformer model from local standalone path: {local_path}")
        model = SentenceTransformer(local_path)
    else:
        logger.info(f"Initializing SentenceTransformer {model_id} model from Hugging Face...")
        model = SentenceTransformer(model_id, revision=model_asset['version_tag'])

    os.makedirs(CHROMA_DIR, exist_ok=True)
    client = chromadb.PersistentClient(path=CHROMA_DIR)
    
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass
        
    collection = client.create_collection(COLLECTION_NAME, metadata={"hnsw:space": "cosine"})
    total = len(qa_pairs)
    
    logger.info(f"Loading {total} records into ChromaDB in batches of {BATCH_SIZE}...")
    for i in range(0, total, BATCH_SIZE):
        batch = qa_pairs[i : i + BATCH_SIZE]
        docs = [qa["query"] for qa in batch]
        embeddings = model.encode(docs).tolist()
        ids = [f"kcc_{i+j}" for j in range(len(batch))]
        metadatas = [
            {
                "answer": qa["answer"],
                "crop": qa["crop"],
                "district": qa["district"],
                "state": qa["state"],
                "season": qa["season"],
            }
            for qa in batch
        ]
        collection.add(documents=docs, embeddings=embeddings, ids=ids, metadatas=metadatas)
        if (i // BATCH_SIZE) % 5 == 0:
            logger.info(f"Indexed {i + len(batch)} / {total} entries...")

    logger.info(f"Ingestion complete. ChromaDB has {collection.count()} records indexed.")


if __name__ == "__main__":
    from core.auth import supabase
    
    try:
        # Seed registry with approved defaults
        from core.asset_registry import seed_asset_registry
        seed_asset_registry(supabase)
        
        # Load and verify KCC dataset from data.gov.in
        dataset_id = "data.gov.in/kcc"
        dataset_asset = verify_and_resolve_asset(dataset_id, supabase)
        logger.info(f"Using verified open dataset: {dataset_asset['name']}")
        
        # Scan raw files and ingest
        pairs = load_and_build_qa_pairs()
        ingest_to_chromadb(pairs)
        
        # Log ingestion run hashes for compliance auditing
        files = glob.glob(f"{DATA_DIR}/*.csv")
        for f in files:
            log_ingestion_run(
                asset_id=dataset_id,
                file_path=f,
                schema_metadata={"crop_columns": "mapped", "count": len(pairs)},
                db=supabase
            )
    except Exception as e:
        logger.error(f"Ingestion process halted: {str(e)}")
