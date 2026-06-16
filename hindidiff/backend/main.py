import os
import httpx
import logging
import random
import io
import base64
from PIL import Image, ImageDraw, ImageFont
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Import core dependencies from root core/auth.py
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from core.auth import get_current_user, enforce_quota, increment_usage, supabase
from core.asset_registry import verify_and_resolve_asset
from core.compliance import log_compliance_event

load_dotenv()

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("hindidiff.backend")

app = FastAPI(
    title="HindiDiff Backend Proxy",
    description="Thin API gateway for Hindi text-to-image offloading heavy inference to Hugging Face Spaces."
)

# SlowAPI Limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Allowed CORS
ALLOWED_ORIGINS = [
    "https://ayojit-intelligence.vercel.app",
    "http://localhost:3000"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STYLES = ["art", "portrait", "cartoon", "traditional", "wedding", "nature"]
SIZES = ["square", "portrait", "landscape", "thumbnail"]
HF_SPACE_URL = os.getenv("HF_SPACE_URL", "")

class GenerateRequest(BaseModel):
    prompt: str = Field(..., max_length=500, description="Hindi or Hinglish text description")
    style: str = Field("art", description="Art style enhancer type")
    size: str = Field("square", description="Output dimensions ratio")
    seed: Optional[int] = Field(None, description="Deterministic seed value")
    variations: int = Field(1, ge=1, le=4, description="Number of variations to generate")

    @field_validator("prompt")
    @classmethod
    def sanitize_prompt(cls, v: str) -> str:
        # Strip simple HTML/script injections
        cleaned = re.sub(r'<[^>]*>', '', v)
        if not cleaned.strip():
            raise ValueError("Prompt cannot be empty after sanitization")
        return cleaned.strip()

    @field_validator("style")
    @classmethod
    def validate_style(cls, v: str) -> str:
        if v not in STYLES:
            raise ValueError(f"Style must be one of: {STYLES}")
        return v

    @field_validator("size")
    @classmethod
    def validate_size(cls, v: str) -> str:
        if v not in SIZES:
            raise ValueError(f"Size must be one of: {SIZES}")
        return v


# Import prompt helper and storage helper inside routing to avoid cyclic import issues
from hindidiff.backend.translate import translate_to_hindi, normalize_prompt
from hindidiff.backend.storage import upload_base64_image
import re

@app.get("/")
def root():
    return {
        "status": "active",
        "model": "FLUX.1 [schnell] Proxy Gateway",
        "styles": STYLES,
        "sizes": SIZES
    }


# Server-side concurrent limit count
CONCURRENT_LIMIT = 2
active_generations = 0

def generate_offline_banner(prompt_original: str, prompt_hindi: str, style: str, size: str) -> str:
    # 1. Map size options to width & height
    size_map = {
        "square": (1024, 1024),
        "portrait": (768, 1024),
        "landscape": (1024, 768),
        "thumbnail": (512, 512),
    }
    width, height = size_map.get(size, (1024, 1024))
    
    # Create RGBA image
    image = Image.new("RGBA", (width, height), (255, 255, 255, 255))
    draw = ImageDraw.Draw(image)
    
    # Palette definition (Neo-brutalist theme)
    colors = [
        (255, 222, 71, 255),  # Yellow #FFDE47
        (0, 255, 102, 255),   # Neon Green
        (0, 229, 255, 255),   # Bright Cyan
        (255, 78, 136, 255),  # Hot Pink
        (179, 136, 255, 255), # Pastel Purple
    ]
    # Pick a background color based on prompt length or style to make it dynamic
    bg_color = colors[len(prompt_original) % len(colors)]
    
    # Draw Background
    draw.rectangle([0, 0, width, height], fill=bg_color)
    
    # Draw Dot Grid Pattern in Background for extra visual texture
    dot_color = (0, 0, 0, 40) # Subtle black dots
    dot_spacing = 40
    for x in range(dot_spacing // 2, width, dot_spacing):
        for y in range(dot_spacing // 2, height, dot_spacing):
            draw.ellipse([x - 2, y - 2, x + 2, y + 2], fill=dot_color)
            
    # Draw Thick Outer Border
    border_width = min(width, height) // 100
    if border_width < 4:
        border_width = 4
    draw.rectangle([border_width, border_width, width - border_width, height - border_width], outline=(0, 0, 0, 255), width=border_width)
    
    # Load fonts
    def load_font(font_size):
        # Candidates for standard TrueType fonts supporting Hindi (Nirmala / Mangal)
        candidates = [
            "C:/Windows/Fonts/nirmala.ttf",
            "C:/Windows/Fonts/mangal.ttf",
            "C:/Windows/Fonts/segoeuib.ttf",
            "C:/Windows/Fonts/segoeui.ttf",
            "C:/Windows/Fonts/arial.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/System/Library/Fonts/Supplemental/Arial.ttf"
        ]
        for path in candidates:
            if os.path.exists(path):
                try:
                    return ImageFont.truetype(path, font_size)
                except Exception:
                    pass
        return ImageFont.load_default()
        
    title_font = load_font(int(min(width, height) * 0.04))
    body_font = load_font(int(min(width, height) * 0.03))
    hindi_font = load_font(int(min(width, height) * 0.035))
    badge_font = load_font(int(min(width, height) * 0.025))
    
    # Draw some abstract geometric shapes (brutalist rectangles/circles)
    circle_size = int(min(width, height) * 0.25)
    circle_x = width - circle_size - border_width * 4
    circle_y = border_width * 4
    # shadow
    draw.ellipse([circle_x + 8, circle_y + 8, circle_x + circle_size + 8, circle_y + circle_size + 8], fill=(0, 0, 0, 255))
    # outline and fill
    draw.ellipse([circle_x, circle_y, circle_x + circle_size, circle_y + circle_size], fill=(255, 255, 255, 255), outline=(0, 0, 0, 255), width=4)
    # Put AI label
    draw.text((circle_x + circle_size // 4, circle_y + circle_size // 3), "AI", fill=(0, 0, 0, 255), font=title_font)
    
    # Main Window Card
    card_width = int(width * 0.8)
    card_height = int(height * 0.5)
    card_x = (width - card_width) // 2
    card_y = (height - card_height) // 2 + int(height * 0.05)
    
    # Shadow offset
    shadow_offset = 12
    draw.rectangle([card_x + shadow_offset, card_y + shadow_offset, card_x + card_width + shadow_offset, card_y + card_height + shadow_offset], fill=(0, 0, 0, 255))
    
    # Card Fill
    draw.rectangle([card_x, card_y, card_x + card_width, card_y + card_height], fill=(255, 255, 255, 255), outline=(0, 0, 0, 255), width=5)
    
    # Window Header Bar (dark bar at the top of the card)
    header_height = int(card_height * 0.15)
    if header_height < 30:
        header_height = 30
    draw.rectangle([card_x, card_y, card_x + card_width, card_y + header_height], fill=(0, 0, 0, 255))
    
    # Draw simulated window controls (red, yellow, green dots)
    dot_radius = int(header_height * 0.2)
    if dot_radius < 4:
        dot_radius = 4
    dot_spacing = dot_radius * 3
    start_x = card_x + dot_radius * 3
    start_y = card_y + header_height // 2
    
    draw.ellipse([start_x - dot_radius, start_y - dot_radius, start_x + dot_radius, start_y + dot_radius], fill=(255, 95, 87, 255))
    draw.ellipse([start_x + dot_spacing - dot_radius, start_y - dot_radius, start_x + dot_spacing + dot_radius, start_y + dot_radius], fill=(255, 189, 46, 255))
    draw.ellipse([start_x + dot_spacing * 2 - dot_radius, start_y - dot_radius, start_x + dot_spacing * 2 + dot_radius, start_y + dot_radius], fill=(39, 201, 63, 255))
    
    # Title in Header Bar
    draw.text((start_x + dot_spacing * 3, card_y + int(header_height * 0.1)), "HINDIDIFF OFFLINE GENERATOR", fill=(255, 255, 255, 255), font=badge_font)
    
    # Content Area
    content_y = card_y + header_height + 20
    content_x = card_x + 20
    max_text_width = card_width - 40
    
    # Wrap text helper function
    def wrap_text(text, font, max_width):
        words = text.split()
        lines = []
        current_line = []
        for word in words:
            test_line = " ".join(current_line + [word])
            try:
                line_width = font.getlength(test_line)
            except AttributeError:
                try:
                    line_width = draw.textsize(test_line, font=font)[0]
                except Exception:
                    line_width = len(test_line) * 10
            if line_width <= max_width:
                current_line.append(word)
            else:
                if current_line:
                    lines.append(" ".join(current_line))
                    current_line = [word]
                else:
                    lines.append(word)
        if current_line:
            lines.append(" ".join(current_line))
        return lines

    # Write translated/original prompts
    draw.text((content_x, content_y), "Prompt Translation:", fill=(120, 120, 120, 255), font=badge_font)
    content_y += int(min(width, height) * 0.04)
    
    # Display Devanagari Translation
    hindi_lines = wrap_text(prompt_hindi, hindi_font, max_text_width)
    for line in hindi_lines[:3]:
        draw.text((content_x, content_y), line, fill=(233, 30, 99, 255), font=hindi_font)
        content_y += int(min(width, height) * 0.05)
        
    content_y += 10
    draw.text((content_x, content_y), "Original:", fill=(120, 120, 120, 255), font=badge_font)
    content_y += int(min(width, height) * 0.04)
    
    orig_lines = wrap_text(prompt_original, body_font, max_text_width)
    for line in orig_lines[:3]:
        draw.text((content_x, content_y), f'"{line}"', fill=(0, 0, 0, 255), font=body_font)
        content_y += int(min(width, height) * 0.045)
        
    # Draw style badge in bottom right corner of canvas
    badge_w = int(width * 0.28)
    badge_h = int(height * 0.08)
    badge_x = width - badge_w - border_width * 4
    badge_y = height - badge_h - border_width * 4
    
    style_styles = {
        "art": {"badge_color": (0, 229, 255, 255)},
        "portrait": {"badge_color": (179, 136, 255, 255)},
        "cartoon": {"badge_color": (255, 222, 71, 255)},
        "traditional": {"badge_color": (255, 78, 136, 255)},
        "wedding": {"badge_color": (255, 105, 180, 255)},
        "nature": {"badge_color": (0, 255, 102, 255)},
    }
    badge_bg = style_styles.get(style, {"badge_color": (0, 229, 255, 255)})["badge_color"]
    
    # Badge shadow
    draw.rectangle([badge_x + 6, badge_y + 6, badge_x + badge_w + 6, badge_y + badge_h + 6], fill=(0, 0, 0, 255))
    # Badge fill
    draw.rectangle([badge_x, badge_y, badge_x + badge_w, badge_y + badge_h], fill=badge_bg, outline=(0, 0, 0, 255), width=3)
    # Badge text
    draw.text((badge_x + 10, badge_y + badge_h // 4), f"STYLE: {style.upper()}", fill=(0, 0, 0, 255), font=badge_font)
    
    # Save image to base64 string
    buffered = io.BytesIO()
    image.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return img_str

@app.post("/generate")
@limiter.limit("5/minute")
async def generate(req: GenerateRequest, request: Request, user: dict = Depends(enforce_quota("hindidiff", "image_gen"))):
    """Enforces quota limits, translates prompt, requests HF Space inference, and uploads to Cloudinary."""
    global active_generations
    if active_generations >= CONCURRENT_LIMIT:
        raise HTTPException(
            status_code=503,
            detail="The generation queue is currently full. Please try again in a moment."
        )

    # 1. Translate prompt from Hinglish/English to Hindi
    try:
        hindi_prompt = await translate_to_hindi(req.prompt)
    except Exception as translate_err:
        logger.warning(f"Translation failed, using original prompt: {str(translate_err)}")
        hindi_prompt = req.prompt
    enhanced_prompt = normalize_prompt(hindi_prompt, style=req.style)

    # 2. Map size options to width & height
    size_map = {
        "square": (1024, 1024),
        "portrait": (768, 1024),
        "landscape": (1024, 768),
        "thumbnail": (512, 512),
    }
    width, height = size_map.get(req.size, (1024, 1024))

    # Resolve approved image model from registry or fallback to local Pillow engine
    resolved_asset_id = "black-forest-labs/FLUX.1-schnell"
    try:
        if supabase:
            resolved_asset = verify_and_resolve_asset("black-forest-labs/FLUX.1-schnell", supabase)
            resolved_asset_id = resolved_asset["id"]
    except Exception as license_err:
        logger.warning(f"License verification failed or skipped for image generation: {str(license_err)}")
        if not HF_SPACE_URL:
            # Safe local fallback identifier
            resolved_asset_id = "local.pil.neo_brutalist"

    active_generations += 1
    try:
        if supabase and user.get("user_id"):
            try:
                log_compliance_event(
                    app_id="hindidiff",
                    action="image_gen",
                    asset_id=resolved_asset_id,
                    user_id=user["user_id"],
                    db=supabase
                )
            except Exception as audit_err:
                logger.warning(f"Could not log compliance event: {str(audit_err)}")

        if not HF_SPACE_URL:
            logger.info("HF_SPACE_URL is not configured. Generating high-quality stylized neo-brutalist graphic locally.")
            images = []
            for i in range(req.variations):
                seed = req.seed if (req.seed is not None and i == 0) else random.randint(0, 2**32 - 1)
                
                # Generate local Pillow base64 image
                base64_img = generate_offline_banner(req.prompt, hindi_prompt, req.style, req.size)
                
                # Upload to Cloudinary (will return base64 data URI if Cloudinary is not configured)
                cloudinary_url = upload_base64_image(base64_img, filename=f"hindidiff_{user.get('user_id', 'offline')}_{seed}")
                
                if supabase and user.get("user_id"):
                    try:
                        supabase.table("generations").insert({
                            "user_id": user["user_id"],
                            "prompt": req.prompt,
                            "image_url": cloudinary_url,
                            "seed": seed,
                            "asset_id": resolved_asset_id
                        }).execute()
                    except Exception as db_err:
                        logger.warning(f"Could not log generation metadata to database: {str(db_err)}")

                images.append({
                    "image_url": cloudinary_url,
                    "seed": seed,
                    "size": f"{width}x{height}"
                })

            if user.get("user_id"):
                try:
                    increment_usage(user["user_id"], "hindidiff", "image_gen", asset_id=resolved_asset_id)
                except Exception as usage_err:
                    logger.warning(f"Could not increment usage: {str(usage_err)}")

            return {
                "prompt_original": req.prompt,
                "prompt_enhanced": enhanced_prompt,
                "images": images,
                "quota_status": "offline_mode"
            }

        # 3. Call Hugging Face Space endpoints
        images = []
        async with httpx.AsyncClient(timeout=120.0) as client:
            for i in range(req.variations):
                # Generate unique seed per variation if not explicitly given
                seed = req.seed if (req.seed is not None and i == 0) else random.randint(0, 2**32 - 1)
                
                payload = {
                    "prompt": enhanced_prompt,
                    "width": width,
                    "height": height,
                    "seed": seed
                }
                
                hf_headers = {}
                hf_token = os.getenv("HF_TOKEN")
                if hf_token:
                    hf_headers["Authorization"] = f"Bearer {hf_token}"

                logger.info(f"Dispatching query to HF Spaces: {HF_SPACE_URL}/generate (Seed: {seed})")
                resp = await client.post(
                    f"{HF_SPACE_URL}/generate",
                    json=payload,
                    headers=hf_headers
                )
                
                if resp.status_code != 200:
                    logger.error(f"HF Inference Space returned error {resp.status_code}: {resp.text}")
                    raise HTTPException(status_code=502, detail="Upstream image generation server failed")
                
                resp_data = resp.json()
                base64_img = resp_data["image_base64"]
                
                # 4. Upload generated image to Cloudinary
                cloudinary_url = upload_base64_image(base64_img, filename=f"hindidiff_{user.get('user_id', 'offline')}_{seed}")
                
                # 5. Save metadata to generations database table via Supabase
                if supabase and user.get("user_id"):
                    supabase.table("generations").insert({
                        "user_id": user["user_id"],
                        "prompt": req.prompt,
                        "image_url": cloudinary_url,
                        "seed": seed,
                        "asset_id": resolved_asset_id
                    }).execute()
                
                images.append({
                    "image_url": cloudinary_url,
                    "seed": seed,
                    "size": f"{width}x{height}"
                })

        # 6. Log transaction count to user quota logs
        if user.get("user_id"):
            increment_usage(user["user_id"], "hindidiff", "image_gen", asset_id=resolved_asset_id)

        return {
            "prompt_original": req.prompt,
            "prompt_enhanced": enhanced_prompt,
            "images": images,
            "quota_status": "updated"
        }
        
    except Exception as e:
        logger.error(f"Generation request encountered unexpected error: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Internal server error during image generation")
    finally:
        active_generations -= 1


@app.get("/health")
def health():
    return {"status": "ok"}
