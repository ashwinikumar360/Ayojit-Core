import logging
from functools import lru_cache

logger = logging.getLogger("docpatram.anonymizer")

INDIAN_PII_ENTITIES = [
    "PERSON",
    "PHONE_NUMBER",
    "EMAIL_ADDRESS",
    "LOCATION",
    "IN_PAN",
    "DATE_TIME",
    "BANK_ACCOUNT",
    "CREDIT_CARD",
]

@lru_cache(maxsize=1)
def get_engines():
    """Initializes Presidio engines. Gracefully handles spaCy model absence."""
    try:
        from presidio_analyzer import AnalyzerEngine
        from presidio_anonymizer import AnonymizerEngine
        analyzer = AnalyzerEngine()
        anonymizer = AnonymizerEngine()
        return analyzer, anonymizer
    except Exception as e:
        logger.error(f"Presidio engine initialization failed: {str(e)}. PII anonymization will run in dummy mode.")
        return None, None


def anonymize_text(text: str, language: str = "en") -> dict:
    """Masks PII elements in document text using Microsoft Presidio."""
    analyzer, anonymizer = get_engines()
    
    if not analyzer or not anonymizer:
        # Fallback: Simple regex mock/placeholder masking so the pipeline doesn't break
        logger.warning("Running dummy fallback regex anonymizer.")
        import re
        masked = text
        # Simple Aadhaar numbers: 12 digits
        masked = re.sub(r'\b\d{4}\s\d{4}\s\d{4}\b', '[AADHAAR MASKED]', masked)
        masked = re.sub(r'\b\d{12}\b', '[AADHAAR MASKED]', masked)
        # PAN numbers: 5 letters, 4 digits, 1 letter
        masked = re.sub(r'\b[A-Z]{5}\d{4}[A-Z]\b', '[PAN MASKED]', masked)
        # Emails
        masked = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL MASKED]', masked)
        
        return {
            "anonymized_text": masked,
            "pii_found": [],
            "pii_count": 0
        }

    try:
        results = analyzer.analyze(
            text=text,
            entities=INDIAN_PII_ENTITIES,
            language=language,
        )
        anonymized = anonymizer.anonymize(text=text, analyzer_results=results)
        
        pii_found = [
            {"entity_type": r.entity_type, "score": round(r.score, 2)}
            for r in results
        ]
        
        return {
            "anonymized_text": anonymized.text,
            "pii_found": pii_found,
            "pii_count": len(pii_found),
        }
    except Exception as e:
        logger.error(f"Presidio analysis failed: {str(e)}")
        return {
            "anonymized_text": text,
            "pii_found": [],
            "pii_count": 0
        }


def safe_extract(text: str) -> str:
    """Helper returning anonymized text string only."""
    return anonymize_text(text)["anonymized_text"]
