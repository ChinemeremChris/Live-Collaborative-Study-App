import boto3
import uuid
import os
import logging
from dotenv import load_dotenv
from botocore.config import Config

load_dotenv()

logger = logging.getLogger(__name__)

s3_client = boto3.client(
    "s3",
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION"),
    config=Config(signature_version="s3v4")
)

BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")
CLOUDFRONT_DOMAIN = os.getenv("AWS_CLOUDFRONT_DOMAIN")

def generate_upload_url(file_name: str, file_type: str) -> dict:
    if "." not in file_name:
        raise ValueError("Invalid file name")
    file_extension = file_name.split(".")[-1].lower()
    file_key = f"cards/{uuid.uuid4()}.{file_extension}"

    presigned_url = s3_client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": BUCKET_NAME,
            "Key": file_key,
            "ContentType": file_type
        },
        ExpiresIn=300
    )

    permanent_url = f"https://{CLOUDFRONT_DOMAIN}/{file_key}"

    return {
        "presigned_url": presigned_url,
        "permanent_url": permanent_url
    }

def delete_image(permanent_url: str) -> None:
    try:
        file_key = permanent_url.replace(f"https://{CLOUDFRONT_DOMAIN}/", "")
        s3_client.delete_object(Bucket=BUCKET_NAME, Key=file_key)
        logger.info(f"Deleted S3 object: {file_key}")
    except Exception as e:
        logger.error(f"Failed to delete S3 object {file_key}: {e}", exc_info=True)

def batch_delete_image(permanent_urls: list[str]) -> None:
    if not permanent_urls:
        return
    try:
        objects = []
        for url in permanent_urls:
            file_key = url.replace(f"https://{CLOUDFRONT_DOMAIN}/", "")
            objects.append({"Key": file_key})
        s3_client.delete_objects(Bucket=BUCKET_NAME, Delete={"Objects": objects})
        logger.info(f"Deleted {len(objects)} objects from S3")
    except Exception as e:
        logger.error(f"Failed batch delete: {e}", exc_info=True)


    