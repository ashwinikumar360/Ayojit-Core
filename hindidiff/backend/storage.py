import os
import base64
import logging
import cloudinary
import cloudinary.uploader

logger = logging.getLogger("hindidiff.storage")

# Configure Cloudinary
# Expected env: CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
cloudinary.config(
    cloudinary_url=os.getenv("CLOUDINARY_URL")
)


def upload_base64_image(base64_data: str, filename: str = "hindidiff_gen") -> str:
    """
    Upload base64 image string to Cloudinary.
    Returns the secure URL of the uploaded asset.
    """
    if not os.getenv("CLOUDINARY_URL"):
        logger.warning("CLOUDINARY_URL not set; returning placeholder data url.")
        return f"data:image/png;base64,{base64_data}"

    try:
        # Format base64 data for Cloudinary
        image_data = f"data:image/png;base64,{base64_data}"
        
        # Upload
        upload_result = cloudinary.uploader.upload(
            image_data,
            public_id=filename,
            folder="hindidiff",
            overwrite=True,
            resource_type="image"
        )
        
        secure_url = upload_result.get("secure_url")
        logger.info(f"Image uploaded successfully to Cloudinary: {secure_url}")
        return secure_url
    except Exception as e:
        logger.error(f"Failed to upload image to Cloudinary: {str(e)}")
        # Fallback to local data URL on upload error so service doesn't hard crash
        return f"data:image/png;base64,{base64_data}"
