"""Unit tests for S3StorageService endpoint handling — written FIRST (RED).

With a custom endpoint (MinIO behind Caddy) the client must use path-style
addressing: virtual-host style would resolve bucket.domain and break.
"""

from __future__ import annotations

from unittest.mock import MagicMock

import boto3
import pytest

from src.adapters.output.storage.s3_storage_service import S3StorageService


class TestCustomEndpoint:
    def test_client_uses_path_style_addressing(self, monkeypatch: pytest.MonkeyPatch) -> None:
        captured: dict = {}

        def fake_client(service: str, **kwargs: object) -> MagicMock:
            captured.update(kwargs)
            return MagicMock()

        monkeypatch.setattr(boto3, "client", fake_client)

        S3StorageService(
            bucket="kibuka-assets",
            endpoint_url="https://kibuka.omarfourati.de",
            access_key_id="key",
            secret_access_key="secret",
        )

        config = captured.get("config")
        assert config is not None, "custom endpoint must set a boto3 Config"
        assert config.s3 == {"addressing_style": "path"}

    @pytest.mark.asyncio
    async def test_public_url_is_endpoint_bucket_key(self) -> None:
        svc = S3StorageService(
            bucket="kibuka-assets",
            endpoint_url="https://kibuka.omarfourati.de",
            access_key_id="key",
            secret_access_key="secret",
        )

        url = await svc.get_public_url("books/b1/cover.png")

        assert url == "https://kibuka.omarfourati.de/kibuka-assets/books/b1/cover.png"

    @pytest.mark.asyncio
    async def test_public_url_base_overrides_internal_endpoint(self) -> None:
        """Uploads go to the internal endpoint; public links must use the
        externally reachable base so browsers can load the assets."""
        svc = S3StorageService(
            bucket="kibuka-assets",
            endpoint_url="http://s3:8333",
            public_url_base="https://kibuka.omarfourati.de",
            access_key_id="key",
            secret_access_key="secret",
        )

        url = await svc.get_public_url("books/b1/cover.png")

        assert url == "https://kibuka.omarfourati.de/kibuka-assets/books/b1/cover.png"


class TestUploadCaching:
    @pytest.mark.asyncio
    async def test_uploads_are_cacheable_for_a_year(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Buch-Assets haben feste Keys pro Buch-ID — Browser dürfen sie
        dauerhaft cachen (schnellerer Seitenaufbau, weniger Traffic)."""
        client = MagicMock()
        monkeypatch.setattr(boto3, "client", lambda *a, **k: client)
        svc = S3StorageService(bucket="kibuka-assets", endpoint_url="http://s3:8333")

        await svc.upload_image(b"x", "books/b1/cover.webp", "image/webp")

        kwargs = client.put_object.call_args.kwargs
        assert kwargs["ContentType"] == "image/webp"
        assert kwargs["CacheControl"] == "public, max-age=31536000, immutable"
