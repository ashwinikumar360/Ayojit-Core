import io
import os
import logging
from PIL import Image
import pytesseract
from pdf2image import convert_from_bytes
from typing import Union, List

logger = logging.getLogger("docpatram.ocr")

LANG_MAP = {
    "hindi": "hin",
    "english": "eng",
    "bengali": "ben",
    "telugu": "tel",
    "marathi": "mar",
    "tamil": "tam",
    "gujarati": "guj",
    "kannada": "kan",
    "punjabi": "pan",
    "odia": "ori",
    "mixed": "hin+eng",
}


def extract_text_from_image(image: Image.Image, language: str = "mixed") -> str:
    """Preprocess image and execute OCR extraction using Tesseract."""
    lang_code = LANG_MAP.get(language, "hin+eng")
    
    try:
        import cv2
        import numpy as np
        
        # Preprocessing to improve low contrast scanned documents
        img_array = np.array(image)
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        thresh = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        processed = Image.fromarray(thresh)
    except ImportError:
        logger.warning("OpenCV/Numpy not available, using raw image for OCR.")
        processed = image
    except Exception as e:
        logger.error(f"Image preprocessing failed: {str(e)}")
        processed = image

    try:
        config = "--oem 3 --psm 6"  # LSTM engine, uniform block
        text = pytesseract.image_to_string(processed, lang=lang_code, config=config)
        return text.strip()
    except Exception as e:
        logger.error(f"Tesseract extraction failed: {str(e)}")
        return ""


def extract_from_pdf(pdf_bytes: bytes, language: str = "mixed") -> List[str]:
    """Convert PDF pages into images and run OCR on each."""
    try:
        images = convert_from_bytes(pdf_bytes, dpi=300)
        return [extract_text_from_image(img, language) for img in images]
    except Exception as e:
        logger.error(f"Failed to read/render PDF: {str(e)}")
        return []


def extract_from_upload(file_bytes: bytes, filename: str, language: str = "mixed") -> dict:
    """Routing utility for universal document parsing."""
    ext = filename.lower().split(".")[-1]

    if ext == "pdf":
        pages = extract_from_pdf(file_bytes, language)
        if not pages:
            return {"error": "Could not parse any pages from this PDF file."}
        return {
            "type": "pdf",
            "pages": len(pages),
            "text": "\n\n--- Page Break ---\n\n".join(pages),
            "page_texts": pages,
        }
    elif ext in ["jpg", "jpeg", "png", "tiff", "tif", "bmp"]:
        try:
            image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
            text = extract_text_from_image(image, language)
            return {
                "type": "image",
                "pages": 1,
                "text": text,
                "page_texts": [text]
            }
        except Exception as e:
            logger.error(f"Failed to load image payload: {str(e)}")
            return {"error": "Invalid image file format."}
    else:
        return {"error": f"Unsupported file extension: {ext}"}
