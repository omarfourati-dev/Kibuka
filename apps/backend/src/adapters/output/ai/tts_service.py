"""Google Cloud Text-to-Speech adapter with SSML word-timestamp extraction."""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

# v1beta1 ist Pflicht: Nur dort gibt es SSML-Timepoints (TimepointType.SSML_MARK)
# für die Wort-Timestamps des Karaoke-Highlightings.
from google.cloud import texttospeech_v1beta1 as texttospeech

from ....core.domain.entities.book import WordTimestamp
from ....core.domain.value_objects.language import Language
from ....core.ports.output.i_storage_service import IStorageService
from ....core.ports.output.i_tts_service import ITTSService, TTSResult

# Voice config per language: (language_code, voice_name)
_VOICE_MAP: dict[Language, tuple[str, str]] = {
    Language.DE: ("de-DE", "de-DE-Wavenet-F"),
    Language.AR: ("ar-XA", "ar-XA-Wavenet-B"),
    Language.FR: ("fr-FR", "fr-FR-Wavenet-C"),
    Language.EN: ("en-US", "en-US-Wavenet-H"),
}


def _build_ssml(text: str) -> str:
    """Wrap each word in an SSML <mark> tag for timestamp extraction."""
    words = text.split()
    if not words:
        return "<speak></speak>"
    marked = " ".join(f'<mark name="{i}:{word}"/>{word}' for i, word in enumerate(words))
    return f"<speak>{marked}</speak>"


def _parse_timestamps(timepoints: Sequence[Any], words: list[str]) -> list[WordTimestamp]:
    """
    Convert Google TTS timepoints to WordTimestamp list.

    Timepoints carry mark_name like "0:Der" and time_seconds as a float.
    End time of word N equals the start time of word N+1; the last word
    gets an artificial end of start + 300 ms.
    """
    if not timepoints:
        return []

    parsed: list[tuple[int, str, int]] = []  # (index, word, start_ms)
    for tp in timepoints:
        mark_name: str = tp.mark_name
        start_ms = int(tp.time_seconds * 1000)
        parts = mark_name.split(":", 1)
        if len(parts) == 2:
            idx = int(parts[0])
            word = parts[1]
            parsed.append((idx, word, start_ms))

    if not parsed:
        return []

    timestamps: list[WordTimestamp] = []
    for i, (_idx, word, start_ms) in enumerate(parsed):
        end_ms = parsed[i + 1][2] if i < len(parsed) - 1 else start_ms + 300
        timestamps.append(WordTimestamp(word=word, start_time_ms=start_ms, end_time_ms=end_ms))

    return timestamps


class GoogleTTSService(ITTSService):
    """Adapter for Google Cloud Text-to-Speech.

    Builds an SSML string with per-word <mark> tags, calls the Google TTS
    API, extracts word-level timestamps from the returned timepoints, uploads
    the resulting MP3 to S3 via IStorageService, and returns a TTSResult.
    """

    def __init__(
        self,
        storage_service: IStorageService,
        credentials_json: str | None = None,
    ) -> None:
        """
        Args:
            storage_service: Adapter for S3 / object-storage uploads.
            credentials_json: JSON string of a Google Cloud service-account
                key.  When *None* the client falls back to Application Default
                Credentials (ADC), which is the preferred approach in
                production when the workload identity is configured.
        """
        self._storage = storage_service

        if credentials_json:
            import json

            from google.oauth2 import service_account

            creds = service_account.Credentials.from_service_account_info(  # type: ignore[no-untyped-call]
                json.loads(credentials_json),
                scopes=["https://www.googleapis.com/auth/cloud-platform"],
            )
            self._client = texttospeech.TextToSpeechAsyncClient(credentials=creds)
        else:
            self._client = texttospeech.TextToSpeechAsyncClient()

    async def synthesize(
        self,
        text: str,
        language: Language,
        book_id: str,
        page_number: int,
    ) -> TTSResult:
        """Synthesize *text* to MP3 audio, upload it, and return a TTSResult.

        Args:
            text: Plain text of the book page.
            language: Target language — must exist in _VOICE_MAP.
            book_id: Used to construct the S3 key.
            page_number: Zero-based page index; zero-padded to 3 digits in the
                S3 key (e.g. page_003.mp3).

        Returns:
            TTSResult with audio bytes, the public S3 URL, per-word timestamps
            and the language.
        """
        language_code, voice_name = _VOICE_MAP[language]
        ssml = _build_ssml(text)

        synthesis_input = texttospeech.SynthesisInput(ssml=ssml)
        voice = texttospeech.VoiceSelectionParams(
            language_code=language_code,
            name=voice_name,
        )
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            sample_rate_hertz=22050,
        )

        # enable_time_pointing ist ein Feld des Requests, nicht der AudioConfig
        request = texttospeech.SynthesizeSpeechRequest(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config,
            enable_time_pointing=[texttospeech.SynthesizeSpeechRequest.TimepointType.SSML_MARK],
        )
        response = await self._client.synthesize_speech(request=request)

        audio_data: bytes = response.audio_content
        word_timestamps = _parse_timestamps(response.timepoints, text.split())

        s3_key = f"books/{book_id}/audio/{language.value}/page_{page_number:03d}.mp3"
        audio_url = await self._storage.upload_audio(audio_data, s3_key)

        return TTSResult(
            audio_data=audio_data,
            audio_url=audio_url,
            word_timestamps=word_timestamps,
            language=language,
        )
