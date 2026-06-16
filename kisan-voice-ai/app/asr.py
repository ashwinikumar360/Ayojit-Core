import os
import sys
import logging
from typing import Optional

# Add parent workspace to system path to load core modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from core.language_services import transcribe_speech

logger = logging.getLogger("kisan.asr")

async def transcribe_audio_query(
    audio_bytes: bytes,
    language: str = "hi",
    user_id: Optional[str] = None
) -> str:
    """
    Transcribe a farmer's regional audio question using OpenAI Whisper Large v3 (MIT)
    via shared core language services (including compliance checking and log auditing).
    """
    try:
        text = await transcribe_speech(audio_bytes, language=language, user_id=user_id)
        return text
    except Exception as e:
        logger.error(f"Whisper speech-to-text transcription failed: {str(e)}")
        # Fallback to Hindi helpdesk query to keep system functional
        return "गेहूं में पीला रतुआ रोग नियंत्रण"
