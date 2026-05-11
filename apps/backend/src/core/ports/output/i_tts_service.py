from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

from ...domain.entities.book import WordTimestamp
from ...domain.value_objects.language import Language


@dataclass
class TTSResult:
    audio_data: bytes
    audio_url: str  # S3 URL after upload
    word_timestamps: list[WordTimestamp]
    language: Language


class ITTSService(ABC):
    @abstractmethod
    async def synthesize(
        self,
        text: str,
        language: Language,
        book_id: str,
        page_number: int,
    ) -> TTSResult: ...
