import os
import re
import logging
import sys

# Add parent workspace path for core modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from core.language_services import translate_text

logger = logging.getLogger("hindidiff.translate")

STYLE_ENHANCERS = {
    "portrait": "यथार्थवादी चित्र, उच्च गुणवत्ता, विस्तृत, पेशेवर फोटोग्राफी",
    "art": "डिजिटल कला, रंगीन, विस्तृत चित्रण",
    "cartoon": "कार्टून शैली, चमकीले रंग, एनिमेशन",
    "traditional": "भारतीय पारंपरिक कला, राजस्थानी शैली, विस्तृत",
    "wedding": "भव्य भारतीय विवाह, रंगीन, पारंपरिक परिधान",
    "nature": "प्राकृतिक दृश्य, यथार्थवादी, सुंदर परिदृश्य",
}

HINGLISH_MAP = {
    "beautiful": "सुंदर",
    "girl": "लड़की",
    "boy": "लड़का",
    "photo": "फोटो",
    "India": "भारत",
    "village": "गाँव",
    "city": "शहर",
    "temple": "मंदिर",
    "bride": "दुल्हन",
    "groom": "दूल्हा",
    "festival": "त्योहार",
    "flower": "फूल",
    "mountain": "पहाड़",
    "river": "नदी",
    "sunset": "सूर्यास्त",
    "sunrise": "सूर्योदय",
}


def normalize_prompt(prompt: str, style: str = "art") -> str:
    """
    Replace common Hinglish words with Hindi counterparts,
    and attach descriptive style prompts.
    """
    normalized = prompt
    for english, hindi in HINGLISH_MAP.items():
        normalized = re.sub(r'\b' + english + r'\b', hindi, normalized, flags=re.IGNORECASE)

    style_addition = STYLE_ENHANCERS.get(style, STYLE_ENHANCERS["art"])
    return f"{normalized}, {style_addition}"


async def translate_to_hindi(text: str) -> str:
    """
    Translate English/mixed prompt to Hindi using self-hosted IndicTrans2 (MIT).
    Replaces the previous Bhashini API dependency with a zero-external-API approach.
    Falls back to local Hinglish dictionary if IndicTrans2 server is unavailable.
    """
    # Simple check if text is mostly English characters
    english_chars = sum(1 for c in text if c.isascii() and c.isalpha())
    total_chars = sum(1 for c in text if c.isalpha())
    
    if total_chars == 0 or (english_chars / total_chars) < 0.5:
        return text  # Already Hindi

    # Call IndicTrans2 via core language service (self-hosted, MIT license)
    try:
        translated = await translate_text(
            text=text,
            source_lang="en",
            target_lang="hi"
        )
        if translated and translated != text:
            logger.info(f"IndicTrans2 translation successful: '{text[:50]}...' -> '{translated[:50]}...'")
            return translated
    except Exception as e:
        logger.warning(f"IndicTrans2 translation failed, using local Hinglish map fallback: {str(e)}")

    # Fallback: apply local Hinglish word-level substitution
    fallback = text
    for english, hindi in HINGLISH_MAP.items():
        fallback = re.sub(r'\b' + english + r'\b', hindi, fallback, flags=re.IGNORECASE)
    
    return fallback
