from __future__ import annotations

from abc import ABC, abstractmethod


class IStorageService(ABC):
    @abstractmethod
    async def upload_image(self, data: bytes, key: str, content_type: str = "image/png") -> str:
        """Upload image data and return public URL."""
        ...

    @abstractmethod
    async def upload_audio(self, data: bytes, key: str) -> str:
        """Upload audio data (MP3) and return public URL."""
        ...

    @abstractmethod
    async def get_public_url(self, key: str) -> str: ...
