"""S3-compatible object storage adapter.

Implements IStorageService using boto3.  In unit tests this class is always
mocked, so the boto3 import is guarded to allow the module to be imported
even when boto3 is not installed in the test environment.
"""

from __future__ import annotations

import logging
from typing import Any

from ....core.ports.output.i_storage_service import IStorageService

logger = logging.getLogger(__name__)


class S3StorageService(IStorageService):
    """Upload images and audio files to an S3-compatible bucket.

    Args:
        bucket: S3 bucket name.
        region: AWS region (e.g. ``"eu-central-1"``).
        access_key_id: AWS access key ID.  When empty, boto3 falls back to the
            default credential chain (instance profile, environment variables,
            ``~/.aws/credentials``).
        secret_access_key: AWS secret access key.  Ignored when *access_key_id*
            is empty.
        endpoint_url: Override endpoint for S3-compatible services (MinIO,
            Cloudflare R2, …).  Leave empty for AWS S3.
        public_url_base: Externally reachable base URL for public links when
            uploads go through an internal endpoint (e.g. SeaweedFS inside the
            compose network, assets served via the public domain).
    """

    def __init__(
        self,
        bucket: str,
        region: str = "eu-central-1",
        access_key_id: str = "",
        secret_access_key: str = "",
        endpoint_url: str = "",
        public_url_base: str = "",
    ) -> None:
        self._bucket = bucket
        self._region = region
        self._endpoint_url = endpoint_url or None
        self._public_url_base = public_url_base.rstrip("/") or None

        # Lazy import — boto3 may not be present in unit-test environments.
        try:
            import boto3
            from botocore.config import Config

            kwargs: dict[str, Any] = {"region_name": region}
            if endpoint_url:
                kwargs["endpoint_url"] = endpoint_url
                # S3-compatible stores behind a plain domain (MinIO, R2) need
                # path-style URLs — virtual-host style would hit bucket.domain.
                kwargs["config"] = Config(s3={"addressing_style": "path"})
            if access_key_id:
                kwargs["aws_access_key_id"] = access_key_id
                kwargs["aws_secret_access_key"] = secret_access_key

            self._client: Any = boto3.client("s3", **kwargs)
        except ImportError:  # pragma: no cover — only in envs without boto3
            logger.warning("boto3 not installed; S3StorageService is non-functional")
            self._client = None

    # ------------------------------------------------------------------
    # IStorageService implementation
    # ------------------------------------------------------------------

    async def upload_image(self, data: bytes, key: str, content_type: str = "image/png") -> str:
        """Upload *data* as *content_type* to *key* and return the public URL."""
        return await self._upload(data, key, content_type)

    async def upload_audio(self, data: bytes, key: str) -> str:
        """Upload *data* as ``audio/mpeg`` to *key* and return the public URL."""
        return await self._upload(data, key, "audio/mpeg")

    async def get_public_url(self, key: str) -> str:
        """Return the public HTTPS URL for an existing object."""
        if self._public_url_base:
            return f"{self._public_url_base}/{self._bucket}/{key}"
        if self._endpoint_url:
            return f"{self._endpoint_url}/{self._bucket}/{key}"
        return f"https://{self._bucket}.s3.{self._region}.amazonaws.com/{key}"

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    async def _upload(self, data: bytes, key: str, content_type: str) -> str:
        if self._client is None:  # pragma: no cover
            logger.warning("S3 client unavailable — returning placeholder URL for %s", key)
            return f"https://placeholder.s3.example.com/{key}"

        logger.debug("Uploading %d bytes to s3://%s/%s", len(data), self._bucket, key)
        # boto3 is sync; run in the default executor for async compatibility.
        import asyncio

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            # Kein ACL-Header: Public-Read regelt die Storage-Seite (SeaweedFS
            # anonymous-Read-Identity bzw. Bucket-Policy); manche S3-kompatiblen
            # Stores lehnen x-amz-acl ab.
            lambda: self._client.put_object(
                Bucket=self._bucket,
                Key=key,
                Body=data,
                ContentType=content_type,
            ),
        )
        return await self.get_public_url(key)
