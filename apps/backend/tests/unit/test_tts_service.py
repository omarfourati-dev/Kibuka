"""Unit tests for GoogleTTSService - pure unit tests with mocks."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.adapters.output.ai.tts_service import GoogleTTSService, _build_ssml, _parse_timestamps
from src.core.domain.entities.book import WordTimestamp
from src.core.domain.value_objects.language import Language


class TestBuildSsml:
    def test_wraps_each_word_in_mark_tag(self):
        result = _build_ssml("Hallo Welt")
        assert '<mark name="0:Hallo"/>Hallo' in result
        assert '<mark name="1:Welt"/>Welt' in result

    def test_wraps_in_speak_tags(self):
        result = _build_ssml("Test")
        assert result.startswith("<speak>")
        assert result.endswith("</speak>")

    def test_single_word(self):
        result = _build_ssml("Hallo")
        assert '<mark name="0:Hallo"/>Hallo' in result
        assert "<speak>" in result

    def test_empty_text(self):
        result = _build_ssml("")
        assert result == "<speak></speak>"

    def test_three_words_all_marked(self):
        result = _build_ssml("Der kleine Bär")
        assert '<mark name="0:Der"/>Der' in result
        assert '<mark name="1:kleine"/>kleine' in result
        assert '<mark name="2:Bär"/>Bär' in result


class TestParseTimestamps:
    def _make_timepoint(self, mark_name: str, time_seconds: float):
        tp = MagicMock()
        tp.mark_name = mark_name
        tp.time_seconds = time_seconds
        return tp

    def test_parses_two_words(self):
        tps = [
            self._make_timepoint("0:Der", 0.0),
            self._make_timepoint("1:kleine", 0.3),
        ]
        result = _parse_timestamps(tps, ["Der", "kleine"])
        assert len(result) == 2
        assert result[0].word == "Der"
        assert result[0].start_time_ms == 0
        assert result[0].end_time_ms == 300  # = start of next word

    def test_last_word_gets_300ms_end(self):
        tps = [
            self._make_timepoint("0:Hallo", 0.5),
        ]
        result = _parse_timestamps(tps, ["Hallo"])
        assert result[0].start_time_ms == 500
        assert result[0].end_time_ms == 800  # 500 + 300

    def test_empty_timepoints_returns_empty_list(self):
        assert _parse_timestamps([], []) == []

    def test_end_time_of_word_is_start_of_next(self):
        tps = [
            self._make_timepoint("0:A", 0.0),
            self._make_timepoint("1:B", 0.4),
            self._make_timepoint("2:C", 1.0),
        ]
        result = _parse_timestamps(tps, ["A", "B", "C"])
        assert result[0].end_time_ms == 400
        assert result[1].end_time_ms == 1000
        assert result[2].end_time_ms == 1300  # 1000 + 300

    def test_returns_word_timestamp_instances(self):
        tps = [self._make_timepoint("0:Test", 0.1)]
        result = _parse_timestamps(tps, ["Test"])
        assert isinstance(result[0], WordTimestamp)

    def test_fractional_seconds_converted_to_ms(self):
        tps = [
            self._make_timepoint("0:Foo", 0.123),
            self._make_timepoint("1:Bar", 0.456),
        ]
        result = _parse_timestamps(tps, ["Foo", "Bar"])
        assert result[0].start_time_ms == 123
        assert result[0].end_time_ms == 456

    def test_malformed_mark_name_without_colon_is_skipped(self):
        tps = [
            self._make_timepoint("badmark", 0.0),
        ]
        # Should return empty — no valid entries parsed
        result = _parse_timestamps(tps, [])
        assert result == []


class TestGoogleTTSService:
    @pytest.mark.asyncio
    async def test_synthesize_returns_tts_result(self):
        mock_storage = AsyncMock()
        mock_storage.upload_audio = AsyncMock(return_value="https://s3.example.com/audio.mp3")

        mock_response = MagicMock()
        mock_response.audio_content = b"fake-mp3-data"
        mock_timepoint = MagicMock()
        mock_timepoint.mark_name = "0:Hallo"
        mock_timepoint.time_seconds = 0.0
        mock_response.timepoints = [mock_timepoint]

        mock_client = AsyncMock()
        mock_client.synthesize_speech = AsyncMock(return_value=mock_response)

        with patch("src.adapters.output.ai.tts_service.texttospeech") as mock_tts:
            mock_tts.TextToSpeechAsyncClient.return_value = mock_client
            mock_tts.SynthesisInput = MagicMock(return_value=MagicMock())
            mock_tts.VoiceSelectionParams = MagicMock(return_value=MagicMock())
            mock_tts.AudioConfig = MagicMock(return_value=MagicMock())
            mock_tts.AudioEncoding.MP3 = "MP3"
            mock_tts.SynthesizeSpeechRequest.TimepointType.SSML_MARK = "SSML_MARK"

            service = GoogleTTSService(storage_service=mock_storage, credentials_json=None)
            service._client = mock_client

            result = await service.synthesize("Hallo", Language.DE, "book-1", 0)

        assert result.audio_data == b"fake-mp3-data"
        assert result.audio_url == "https://s3.example.com/audio.mp3"
        assert result.language == Language.DE
        assert len(result.word_timestamps) == 1
        assert result.word_timestamps[0].word == "Hallo"

    @pytest.mark.asyncio
    async def test_synthesize_uses_correct_s3_key(self):
        mock_storage = AsyncMock()
        mock_storage.upload_audio = AsyncMock(return_value="https://s3.example.com/audio.mp3")

        mock_response = MagicMock()
        mock_response.audio_content = b"data"
        mock_response.timepoints = []

        mock_client = AsyncMock()
        mock_client.synthesize_speech = AsyncMock(return_value=mock_response)

        with patch("src.adapters.output.ai.tts_service.texttospeech") as mock_tts:
            mock_tts.TextToSpeechAsyncClient.return_value = mock_client
            mock_tts.SynthesisInput = MagicMock(return_value=MagicMock())
            mock_tts.VoiceSelectionParams = MagicMock(return_value=MagicMock())
            mock_tts.AudioConfig = MagicMock(return_value=MagicMock())
            mock_tts.AudioEncoding.MP3 = "MP3"
            mock_tts.SynthesizeSpeechRequest.TimepointType.SSML_MARK = "SSML_MARK"

            service = GoogleTTSService(storage_service=mock_storage, credentials_json=None)
            service._client = mock_client

            await service.synthesize("Test", Language.AR, "book-42", 3)

        call_args = mock_storage.upload_audio.call_args
        assert "books/book-42/audio/ar/page_003.mp3" in call_args[0]

    @pytest.mark.asyncio
    async def test_synthesize_arabic_uses_arabic_voice(self):
        mock_storage = AsyncMock()
        mock_storage.upload_audio = AsyncMock(return_value="https://s3.example.com/audio.mp3")

        mock_response = MagicMock()
        mock_response.audio_content = b"data"
        mock_response.timepoints = []

        mock_client = AsyncMock()
        mock_client.synthesize_speech = AsyncMock(return_value=mock_response)

        with patch("src.adapters.output.ai.tts_service.texttospeech") as mock_tts:
            captured_voice_params = {}

            def capture_voice(**kwargs):
                captured_voice_params.update(kwargs)
                return MagicMock()

            mock_tts.TextToSpeechAsyncClient.return_value = mock_client
            mock_tts.SynthesisInput = MagicMock(return_value=MagicMock())
            mock_tts.VoiceSelectionParams = MagicMock(side_effect=capture_voice)
            mock_tts.AudioConfig = MagicMock(return_value=MagicMock())
            mock_tts.AudioEncoding.MP3 = "MP3"
            mock_tts.SynthesizeSpeechRequest.TimepointType.SSML_MARK = "SSML_MARK"

            service = GoogleTTSService(storage_service=mock_storage, credentials_json=None)
            service._client = mock_client

            await service.synthesize("مرحبا", Language.AR, "book-1", 1)

        assert captured_voice_params.get("language_code") == "ar-XA"
        assert captured_voice_params.get("name") == "ar-XA-Wavenet-B"

    @pytest.mark.asyncio
    async def test_synthesize_page_000_formatted_correctly(self):
        mock_storage = AsyncMock()
        mock_storage.upload_audio = AsyncMock(return_value="https://s3.example.com/x.mp3")

        mock_response = MagicMock()
        mock_response.audio_content = b"d"
        mock_response.timepoints = []

        mock_client = AsyncMock()
        mock_client.synthesize_speech = AsyncMock(return_value=mock_response)

        with patch("src.adapters.output.ai.tts_service.texttospeech") as mock_tts:
            mock_tts.TextToSpeechAsyncClient.return_value = mock_client
            mock_tts.SynthesisInput = MagicMock(return_value=MagicMock())
            mock_tts.VoiceSelectionParams = MagicMock(return_value=MagicMock())
            mock_tts.AudioConfig = MagicMock(return_value=MagicMock())
            mock_tts.AudioEncoding.MP3 = "MP3"
            mock_tts.SynthesizeSpeechRequest.TimepointType.SSML_MARK = "SSML_MARK"

            service = GoogleTTSService(storage_service=mock_storage, credentials_json=None)
            service._client = mock_client

            await service.synthesize("Hello", Language.EN, "book-99", 0)

        call_args = mock_storage.upload_audio.call_args
        s3_key = call_args[0][1]
        assert s3_key == "books/book-99/audio/en/page_000.mp3"

    @pytest.mark.asyncio
    async def test_synthesize_returns_empty_timestamps_when_no_timepoints(self):
        mock_storage = AsyncMock()
        mock_storage.upload_audio = AsyncMock(return_value="https://s3.example.com/audio.mp3")

        mock_response = MagicMock()
        mock_response.audio_content = b"audio"
        mock_response.timepoints = []

        mock_client = AsyncMock()
        mock_client.synthesize_speech = AsyncMock(return_value=mock_response)

        with patch("src.adapters.output.ai.tts_service.texttospeech") as mock_tts:
            mock_tts.TextToSpeechAsyncClient.return_value = mock_client
            mock_tts.SynthesisInput = MagicMock(return_value=MagicMock())
            mock_tts.VoiceSelectionParams = MagicMock(return_value=MagicMock())
            mock_tts.AudioConfig = MagicMock(return_value=MagicMock())
            mock_tts.AudioEncoding.MP3 = "MP3"
            mock_tts.SynthesizeSpeechRequest.TimepointType.SSML_MARK = "SSML_MARK"

            service = GoogleTTSService(storage_service=mock_storage, credentials_json=None)
            service._client = mock_client

            result = await service.synthesize("Hello world", Language.EN, "book-1", 1)

        assert result.word_timestamps == []
