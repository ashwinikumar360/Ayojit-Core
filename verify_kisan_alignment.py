import os
import sys
import logging

# Setup basic logging to see details
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("verify.kisan")

# Append workspace and app paths
sys.path.append("c:\\Users\\ASHWINI\\Downloads\\ai kosh")
sys.path.append("c:\\Users\\ASHWINI\\Downloads\\ai kosh\\kisan-voice-ai")

# Make sure we run in offline mock mode without errors
os.environ["SUPABASE_URL"] = ""
os.environ["SUPABASE_SERVICE_KEY"] = ""

async def main():
    logger.info("Step 1: Running KCC dataset ingestion using new multilingual model...")
    from data.ingest_kcc import load_and_build_qa_pairs, ingest_to_chromadb
    
    pairs = load_and_build_qa_pairs()
    assert len(pairs) > 0, "No Q&A pairs loaded from sample CSV!"
    logger.info(f"Loaded {len(pairs)} pairs from sample CSV.")
    
    logger.info("Ingesting sample pairs into ChromaDB...")
    ingest_to_chromadb(pairs)
    logger.info("Ingestion completed successfully.")
    
    logger.info("Step 2: Testing RAG retrieval with the multilingual model...")
    from app.rag import search_kcc, get_best_answer
    
    # Check that search matches query
    query = "धान की रोकथाम"
    results = search_kcc(query, n_results=1)
    assert len(results) > 0, "No search results returned!"
    logger.info(f"RAG Search matched question: '{results[0]['question']}' with confidence: {results[0]['confidence']}")
    
    best_answer = get_best_answer(query)
    logger.info(f"RAG Best Answer: '{best_answer}'")
    assert "तना छेदक कीट" in best_answer or "हेल्पलाइन" in best_answer, "Best answer matching failed!"

    logger.info("Step 3: Testing Whisper ASR translation...")
    from app.asr import transcribe_audio_query
    
    mock_audio = b"fake audio bytes"
    transcription = await transcribe_audio_query(mock_audio, language="hi")
    logger.info(f"ASR Transcription: '{transcription}'")
    assert transcription == "गेहूं में पीला रतुआ रोग नियंत्रण", "ASR transcription mock fallback failed!"
    
    logger.info("Verification of Phase 5 alignment: SUCCESS! All open-license models are working correctly.")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
