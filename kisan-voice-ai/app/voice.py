from twilio.twiml.voice_response import VoiceResponse, Gather, Record
import logging

logger = logging.getLogger("kisan.voice")

WELCOME_MESSAGES = {
    "hi": "नमस्ते! किसान हेल्पलाइन में आपका स्वागत है। कृपया अपनी फसल की समस्या बताएं।",
    "en": "Welcome to Kisan Helpline. Please describe your crop problem after the beep.",
    "te": "నమస్కారం! రైతు సహాయ కేంద్రానికి స్వాగతం. దయచేసి మీ సమస్య చెప్పండి.",
    "ta": "வணக்கம்! விவசாயி உதவி மையத்தில் உங்களை வரவேற்கிறோம்.",
    "mr": "नमस्कार! शेतकरी मदत केंद्रात आपले स्वागत आहे.",
}


def create_welcome_twiml(base_url: str, language: str = "hi") -> str:
    """Renders TwiML XML schema playing welcome audio and starting recording."""
    response = VoiceResponse()
    
    # Configure voice input gather
    gather = Gather(
        input="speech",
        action="/voice/process",
        method="POST",
        language=f"{language}-IN",
        speech_timeout="auto",
        enhanced=True,
    )
    
    welcome_text = WELCOME_MESSAGES.get(language, WELCOME_MESSAGES["hi"])
    gather.play(f"{base_url}/voice/audio?text={welcome_text}&language={language}")
    response.append(gather)
    
    # Fallback response if gather does not register any sound
    fallback_text = "हम आपकी आवाज़ सुन नहीं पाए। कृपया कॉल काटकर पुनः प्रयास करें।"
    response.play(f"{base_url}/voice/audio?text={fallback_text}&language={language}")
    return str(response)


def create_answer_twiml(base_url: str, answer_text: str, language: str = "hi") -> str:
    """Renders TwiML response playing back the extracted RAG answer."""
    response = VoiceResponse()
    response.play(f"{base_url}/voice/audio?text={answer_text}&language={language}")
    
    # Prompt for subsequent questions
    gather = Gather(
        input="speech",
        action="/voice/process",
        method="POST",
        language=f"{language}-IN",
        speech_timeout="auto",
    )
    followup_text = "क्या आपका कोई और कृषि प्रश्न है?"
    gather.play(f"{base_url}/voice/audio?text={followup_text}&language={language}")
    response.append(gather)
    
    response.hangup()
    return str(response)
