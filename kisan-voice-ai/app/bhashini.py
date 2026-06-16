import os
import base64
import httpx
import logging
from typing import Optional

logger = logging.getLogger("kisan.bhashini")

BHASHINI_BASE = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
BHASHINI_AUTH = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"

LANGUAGE_CODES = {
    "hindi": "hi",
    "bengali": "bn",
    "telugu": "te",
    "marathi": "mr",
    "tamil": "ta",
    "gujarati": "gu",
    "kannada": "kn",
    "odia": "or",
    "punjabi": "pa",
    "malayalam": "ml",
    "assamese": "as",
    "maithili": "mai",
    "english": "en",
}


async def get_pipeline_config(source_lang: str, target_lang: str = "hi") -> dict:
    """Retrieves Bhashini pipeline parameters for ASR + Translation + TTS."""
    api_key = os.getenv("BHASHINI_API_KEY")
    user_id = os.getenv("BHASHINI_USER_ID")
    
    if not api_key or not user_id:
        logger.error("Bhashini credentials not set in environment variables!")
        raise ValueError("Missing Bhashini credentials")

    payload = {
        "pipelineTasks": [
            {"taskType": "asr", "config": {"language": {"sourceLanguage": source_lang}}},
            {
                "taskType": "translation",
                "config": {
                    "language": {
                        "sourceLanguage": source_lang,
                        "targetLanguage": target_lang,
                    }
                },
            },
            {
                "taskType": "tts",
                "config": {"language": {"sourceLanguage": target_lang}},
            },
        ],
        "pipelineRequestConfig": {"pipelineId": "64392f96daac500b55c543cd"},
    }
    headers = {
        "userID": user_id,
        "ulcaApiKey": api_key,
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(BHASHINI_AUTH, json=payload, headers=headers)
        r.raise_for_status()
        return r.json()


async def transcribe_and_translate(
    audio_base64: str,
    source_lang: str,
    target_lang: str = "en",
    pipeline_config: Optional[dict] = None,
) -> dict:
    """Converts a farmer's voice input (Devanagari/regional) into English query text."""
    try:
        if pipeline_config is None:
            pipeline_config = await get_pipeline_config(source_lang, target_lang)

        config = pipeline_config.get("pipelineInferenceAPIEndPoint", {})
        callback_url = config.get("callbackUrl", BHASHINI_BASE)
        inference_key = config.get("inferenceApiKey", {})

        payload = {
            "pipelineTasks": [
                {
                    "taskType": "asr",
                    "config": {
                        "language": {"sourceLanguage": source_lang},
                        "serviceId": pipeline_config.get("pipelineResponseConfig", [{}])[0]
                        .get("config", [{}])[0]
                        .get("serviceId", ""),
                        "audioFormat": "wav",
                        "samplingRate": 8000,
                    },
                },
                {
                    "taskType": "translation",
                    "config": {
                        "language": {
                            "sourceLanguage": source_lang,
                            "targetLanguage": target_lang,
                        },
                        "serviceId": pipeline_config.get("pipelineResponseConfig", [{}])[1]
                        .get("config", [{}])[0]
                        .get("serviceId", ""),
                    },
                },
            ],
            "inputData": {
                "audio": [{"audioContent": audio_base64}],
                "input": None,
            },
        }

        headers = {
            inference_key.get("name", "Authorization"): inference_key.get("value", ""),
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(callback_url, json=payload, headers=headers)
            r.raise_for_status()
            result = r.json()

        transcription = (
            result.get("pipelineResponse", [{}])[0]
            .get("output", [{}])[0]
            .get("source", "")
        )
        translation = (
            result.get("pipelineResponse", [{}])[1]
            .get("output", [{}])[0]
            .get("target", "")
        )
        return {"transcription": transcription, "translation": translation}
    except Exception as e:
        logger.error(f"Bhashini transcription and translation pipeline failed: {str(e)}")
        return {"transcription": "", "translation": ""}


async def text_to_speech(text: str, target_lang: str = "hi") -> bytes:
    """Converts response text back into regional audio feedback bytes."""
    try:
        pipeline_config = await get_pipeline_config(target_lang, target_lang)
        config = pipeline_config.get("pipelineInferenceAPIEndPoint", {})
        callback_url = config.get("callbackUrl", BHASHINI_BASE)
        inference_key = config.get("inferenceApiKey", {})

        payload = {
            "pipelineTasks": [
                {
                    "taskType": "tts",
                    "config": {
                        "language": {"sourceLanguage": target_lang},
                        "serviceId": pipeline_config.get("pipelineResponseConfig", [{}])[2]
                        .get("config", [{}])[0]
                        .get("serviceId", ""),
                        "gender": "female",
                        "samplingRate": 8000,
                    },
                }
            ],
            "inputData": {"input": [{"source": text}], "audio": None},
        }

        headers = {
            inference_key.get("name", "Authorization"): inference_key.get("value", ""),
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(callback_url, json=payload, headers=headers)
            r.raise_for_status()
            result = r.json()

        audio_b64 = (
            result.get("pipelineResponse", [{}])[0]
            .get("audio", [{}])[0]
            .get("audioContent", "")
        )
        return base64.b64decode(audio_b64)
    except Exception as e:
        logger.error(f"Bhashini Text-To-Speech generation failed: {str(e)}")
        return b""
