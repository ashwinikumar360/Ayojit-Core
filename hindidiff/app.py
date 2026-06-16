import os
import io
import base64
import random
import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="FLUX.1 [schnell] Inference Server")

MODEL_ID = "black-forest-labs/FLUX.1-schnell"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

pipe = None

def load_pipeline():
    """
    Load FLUX.1 [schnell] pipeline.
    FLUX.1 uses the FluxPipeline from diffusers, not StableDiffusionPipeline.
    License: Apache-2.0 (verified from model card).
    """
    global pipe
    if pipe is None:
        print(f"Loading {MODEL_ID} on {DEVICE}...")
        dtype = torch.bfloat16 if DEVICE == "cuda" else torch.float32
        
        # FLUX.1 [schnell] uses the FluxPipeline architecture
        from diffusers import FluxPipeline
        
        pipe = FluxPipeline.from_pretrained(
            MODEL_ID,
            torch_dtype=dtype,
        )
        pipe = pipe.to(DEVICE)
        if DEVICE == "cuda":
            pipe.enable_model_cpu_offload()
        print("FLUX.1 [schnell] loaded successfully!")
    return pipe

class GenerationRequest(BaseModel):
    prompt: str
    negative_prompt: Optional[str] = None  # FLUX.1 does not use negative prompts
    width: Optional[int] = 1024
    height: Optional[int] = 1024
    num_inference_steps: Optional[int] = 4  # FLUX.1 schnell is optimized for 1-4 steps
    guidance_scale: Optional[float] = 0.0  # FLUX.1 schnell uses guidance_scale=0
    seed: Optional[int] = None

@app.get("/")
def read_root():
    return {"status": "running", "device": DEVICE, "model": MODEL_ID, "license": "Apache-2.0"}

@app.post("/generate")
def generate(req: GenerationRequest):
    pipeline = load_pipeline()
    
    seed = req.seed
    if seed is None:
        seed = random.randint(0, 2**32 - 1)
    
    generator = torch.Generator(device="cpu").manual_seed(seed)
    
    try:
        with torch.inference_mode():
            result = pipeline(
                prompt=req.prompt,
                width=req.width,
                height=req.height,
                num_inference_steps=req.num_inference_steps,
                guidance_scale=req.guidance_scale,
                generator=generator,
                max_sequence_length=256,
            )
        
        image = result.images[0]
        
        # Convert image to Base64
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        img_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
        
        return {
            "image_base64": img_str,
            "seed": seed,
            "width": req.width,
            "height": req.height
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")
