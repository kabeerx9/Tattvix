from dataclasses import dataclass

import boto3
from botocore.client import BaseClient
from botocore.config import Config
from django.conf import settings


class ObjectStorageValidationError(ValueError):
    """Raised before signing an unsafe or unsupported object-storage request."""


@dataclass(frozen=True)
class PresignedUpload:
    object_key: str
    url: str
    method: str
    headers: dict[str, str]
    expires_in_seconds: int


@dataclass(frozen=True)
class ObjectMetadata:
    content_type: str
    content_length: int


class PrivateObjectStorage:
    """Small S3-compatible boundary shared by local MinIO and production R2."""

    def __init__(self, client: BaseClient | None = None):
        self.bucket_name = settings.OBJECT_STORAGE_BUCKET_NAME
        self.max_upload_bytes = settings.OBJECT_STORAGE_MAX_UPLOAD_BYTES
        self.allowed_content_types = settings.OBJECT_STORAGE_ALLOWED_CONTENT_TYPES
        self.presigned_url_ttl_seconds = (
            settings.OBJECT_STORAGE_PRESIGNED_URL_TTL_SECONDS
        )
        self.client = client or self._build_client()

    @staticmethod
    def _build_client() -> BaseClient:
        return boto3.client(
            "s3",
            endpoint_url=settings.OBJECT_STORAGE_ENDPOINT_URL,
            aws_access_key_id=settings.OBJECT_STORAGE_ACCESS_KEY_ID,
            aws_secret_access_key=settings.OBJECT_STORAGE_SECRET_ACCESS_KEY,
            region_name=settings.OBJECT_STORAGE_REGION,
            config=Config(
                signature_version="s3v4",
                s3={"addressing_style": "path"},
            ),
        )

    def create_upload_url(
        self,
        *,
        object_key: str,
        content_type: str,
        content_length: int,
    ) -> PresignedUpload:
        self._validate_object_key(object_key)
        self._validate_upload(content_type=content_type, content_length=content_length)

        url = self.client.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": self.bucket_name,
                "Key": object_key,
                "ContentType": content_type,
                "ContentLength": content_length,
                "CacheControl": "private, no-store",
            },
            ExpiresIn=self.presigned_url_ttl_seconds,
            HttpMethod="PUT",
        )
        return PresignedUpload(
            object_key=object_key,
            url=url,
            method="PUT",
            headers={
                "Content-Type": content_type,
                "Content-Length": str(content_length),
                "Cache-Control": "private, no-store",
            },
            expires_in_seconds=self.presigned_url_ttl_seconds,
        )

    def create_download_url(self, *, object_key: str) -> str:
        self._validate_object_key(object_key)
        return self.client.generate_presigned_url(
            ClientMethod="get_object",
            Params={
                "Bucket": self.bucket_name,
                "Key": object_key,
                "ResponseContentDisposition": "inline",
                "ResponseCacheControl": "private, no-store",
            },
            ExpiresIn=self.presigned_url_ttl_seconds,
            HttpMethod="GET",
        )

    def delete_object(self, *, object_key: str) -> None:
        self._validate_object_key(object_key)
        self.client.delete_object(Bucket=self.bucket_name, Key=object_key)

    def copy_object(
        self,
        *,
        source_key: str,
        destination_key: str,
        content_type: str,
    ) -> None:
        self._validate_object_key(source_key)
        self._validate_object_key(destination_key)
        if content_type not in self.allowed_content_types:
            raise ObjectStorageValidationError(
                f"Unsupported copy content type: {content_type}."
            )
        self.client.copy_object(
            Bucket=self.bucket_name,
            CopySource={"Bucket": self.bucket_name, "Key": source_key},
            Key=destination_key,
            ContentType=content_type,
            CacheControl="private, no-store",
            ContentDisposition="inline",
            MetadataDirective="REPLACE",
        )

    def get_object_metadata(self, *, object_key: str) -> ObjectMetadata:
        self._validate_object_key(object_key)
        response = self.client.head_object(
            Bucket=self.bucket_name,
            Key=object_key,
        )
        return ObjectMetadata(
            content_type=response.get("ContentType", ""),
            content_length=response.get("ContentLength", 0),
        )

    def check_bucket_access(self) -> None:
        self.client.head_bucket(Bucket=self.bucket_name)

    def _validate_upload(self, *, content_type: str, content_length: int) -> None:
        if content_type not in self.allowed_content_types:
            raise ObjectStorageValidationError(
                f"Unsupported upload content type: {content_type}."
            )
        if isinstance(content_length, bool) or not isinstance(content_length, int):
            raise ObjectStorageValidationError("Upload size must be an integer.")
        if content_length < 1:
            raise ObjectStorageValidationError("Upload must not be empty.")
        if content_length > self.max_upload_bytes:
            raise ObjectStorageValidationError(
                f"Upload exceeds the {self.max_upload_bytes}-byte limit."
            )

    @staticmethod
    def _validate_object_key(object_key: str) -> None:
        if not object_key or object_key.startswith("/"):
            raise ObjectStorageValidationError("Object key must be a relative path.")
        if len(object_key.encode("utf-8")) > 1024:
            raise ObjectStorageValidationError("Object key exceeds 1024 bytes.")
        if "\\" in object_key or any(
            part in {"", ".", ".."} for part in object_key.split("/")
        ):
            raise ObjectStorageValidationError("Object key contains an unsafe path.")
        if any(ord(character) < 32 or ord(character) == 127 for character in object_key):
            raise ObjectStorageValidationError(
                "Object key contains control characters."
            )
