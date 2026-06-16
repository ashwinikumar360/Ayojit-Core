import os
import sys
import subprocess
import urllib.request

def download_embedding_model():
    model_id = "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"
    target_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "models", "paraphrase-multilingual-mpnet-base-v2"))
    
    if os.path.exists(target_dir) and os.listdir(target_dir):
        print(f"Embedding model already exists locally at: {target_dir}. Skipping download.")
        return
        
    print(f"Downloading {model_id} from Hugging Face...")
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(model_id)
        os.makedirs(target_dir, exist_ok=True)
        model.save(target_dir)
        print("Embedding model successfully saved locally!")
    except Exception as e:
        print(f"Failed to download/save embedding model: {str(e)}")
        sys.exit(1)

def download_qwen_model():
    model_id = "Qwen/Qwen2.5-0.5B-Instruct"
    target_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "models", "qwen2.5-0.5b-instruct"))
    
    if os.path.exists(target_dir) and os.listdir(target_dir):
        print(f"Qwen model already exists locally at: {target_dir}. Skipping download.")
        return
        
    print(f"Downloading {model_id} from Hugging Face...")
    try:
        from transformers import AutoModelForCausalLM, AutoTokenizer
        tokenizer = AutoTokenizer.from_pretrained(model_id)
        model = AutoModelForCausalLM.from_pretrained(model_id)
        os.makedirs(target_dir, exist_ok=True)
        tokenizer.save_pretrained(target_dir)
        model.save_pretrained(target_dir)
        print("Qwen model successfully saved locally!")
    except Exception as e:
        print(f"Failed to download/save Qwen model: {str(e)}")
        sys.exit(1)

def download_translation_models():
    translation_pairs = {
        "Helsinki-NLP/opus-mt-en-hi": "opus-mt-en-hi",
        "Helsinki-NLP/opus-mt-hi-en": "opus-mt-hi-en"
    }
    
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
    for model_id, local_name in translation_pairs.items():
        target_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "models", local_name))
        if os.path.exists(target_dir) and os.listdir(target_dir):
            print(f"Translation model {local_name} already exists. Skipping download.")
            continue
            
        print(f"Downloading translation model {model_id} from Hugging Face...")
        try:
            tokenizer = AutoTokenizer.from_pretrained(model_id)
            model = AutoModelForSeq2SeqLM.from_pretrained(model_id)
            os.makedirs(target_dir, exist_ok=True)
            tokenizer.save_pretrained(target_dir)
            model.save_pretrained(target_dir)
            print(f"Translation model {local_name} successfully saved locally!")
        except Exception as e:
            print(f"Failed to download translation model {model_id}: {str(e)}")
            sys.exit(1)

def download_whisper_model():
    model_id = "openai/whisper-tiny"
    target_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "models", "whisper-tiny"))
    
    if os.path.exists(target_dir) and os.listdir(target_dir):
        print(f"Whisper-tiny model already exists locally at: {target_dir}. Skipping download.")
        return
        
    print(f"Downloading {model_id} from Hugging Face...")
    try:
        from transformers import AutoProcessor, AutoModelForSpeechSeq2Seq
        processor = AutoProcessor.from_pretrained(model_id)
        model = AutoModelForSpeechSeq2Seq.from_pretrained(model_id)
        os.makedirs(target_dir, exist_ok=True)
        processor.save_pretrained(target_dir)
        model.save_pretrained(target_dir)
        print("Whisper-tiny model successfully saved locally!")
    except Exception as e:
        print(f"Failed to download/save Whisper-tiny model: {str(e)}")
        sys.exit(1)

def download_pincode_dataset():
    data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "pinai", "data"))
    os.makedirs(data_dir, exist_ok=True)
    target_csv = os.path.join(data_dir, "pincode_directory.csv")
    
    if os.path.exists(target_csv) and os.path.getsize(target_csv) > 100000:
        print(f"Pincode dataset already exists at: {target_csv}. Skipping download.")
        return

    url = "https://raw.githubusercontent.com/dropdevrahul/pincodes-india/main/pincode.csv"
    print(f"Downloading All India Pincode Directory CSV from {url}...")
    try:
        urllib.request.urlretrieve(url, target_csv)
        print(f"Dataset successfully downloaded and saved to: {target_csv}")
    except Exception as e:
        print(f"Failed to download pincode dataset: {str(e)}")
        sys.exit(1)

def run_database_seeding():
    print("Seeding PinAI SQLite Database...")
    try:
        env = os.environ.copy()
        env["PYTHONPATH"] = os.path.abspath(os.path.dirname(__file__))
        subprocess.run(
            [sys.executable, "pinai/backend/data_loader.py"],
            env=env,
            check=True
        )
        print("PinAI SQLite Database successfully seeded.")
    except Exception as e:
        print(f"Failed to seed PinAI SQLite database: {str(e)}")
        sys.exit(1)

def run_kisan_chroma_ingestion():
    print("Building Kisan Voice AI ChromaDB Vector Database...")
    try:
        env = os.environ.copy()
        env["PYTHONPATH"] = os.path.abspath(os.path.dirname(__file__))
        subprocess.run(
            [sys.executable, "kisan-voice-ai/data/ingest_kcc.py"],
            env=env,
            check=True
        )
        print("Kisan Voice AI ChromaDB successfully built.")
    except Exception as e:
        print(f"Failed to build Kisan Voice AI ChromaDB: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    print("=== AYOJIT STANDALONE ASSETS & MODELS AUTO-FETCH START ===")
    download_embedding_model()
    download_qwen_model()
    download_translation_models()
    download_whisper_model()
    download_pincode_dataset()
    run_database_seeding()
    run_kisan_chroma_ingestion()
    print("=== AYOJIT STANDALONE ASSETS & MODELS AUTO-FETCH COMPLETE ===")
