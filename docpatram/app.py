import os
import torch
import io
import json
import re
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from PIL import Image
from transformers import AutoProcessor, AutoModelForVision2Seq
from typing import Optional

app = FastAPI(title="Patram-7B Inference Server")

MODEL_ID = "bharatgen/Patram-7B-Instruct"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

processor = None
model = None

def load_model():
    global processor, model
    if model is None:
        print(f"Loading {MODEL_ID} on {DEVICE}... This may take a few minutes.")
        processor = AutoProcessor.from_pretrained(MODEL_ID, trust_remote_code=True)
        model = AutoModelForVision2Seq.from_pretrained(
            MODEL_ID,
            torch_dtype=torch.float16 if DEVICE == "cuda" else torch.float32,
            device_map="auto",
            trust_remote_code=True,
        )
        print("Model loaded successfully!")
    return processor, model

@app.get("/")
def read_root():
    return {"status": "running", "device": DEVICE, "model": MODEL_ID}

@app.post("/extract")
async def extract(
    file: UploadFile = File(...),
    document_type: str = Form("general")
):
    try:
        proc, md = load_model()
        file_bytes = await file.read()
        image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")

    prompts = {
        "aadhaar": "Extract from this Aadhaar card: name, date of birth, gender, address, Aadhaar number (last 4 digits only). Return as JSON.",
        "pan": "Extract from this PAN card: name, father's name, date of birth, PAN number. Return as JSON.",
        "ration_card": "Extract from this ration card: head of family name, address, district, state, card number, category, family members count. Return as JSON.",
        "land_record": "Extract from this land record document: survey number, area, owner name, location, district, state, village. Return as JSON.",
        "hospital_form": "Extract from this hospital form: patient name, age, gender, diagnosis, doctor name, date, hospital name. Return as JSON.",
        "pension_form": "Extract from this pension form: beneficiary name, age, scheme name, bank details, district, state, beneficiary ID. Return as JSON.",
        "general": "Extract all text and key information from this document. Identify the document type and extract key fields. Return as JSON with fields: document_type, extracted_text, key_fields.",
    }

    prompt = prompts.get(document_type, prompts["general"])

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image", "image": image},
                {"type": "text", "text": prompt},
            ],
        }
    ]

    try:
        text = proc.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = proc(text=[text], images=[image], return_tensors="pt").to(DEVICE)

        with torch.no_grad():
            generated_ids = md.generate(
                **inputs,
                max_new_tokens=512,
                do_sample=False,
                temperature=1.0,
            )

        output = proc.batch_decode(
            generated_ids[:, inputs["input_ids"].shape[1]:],
            skip_special_tokens=True,
        )[0]

        # Try to parse JSON output
        json_match = re.search(r"\{.*\}", output, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass

        return {"raw_output": output, "document_type": document_type}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference processing failed: {str(e)}")
