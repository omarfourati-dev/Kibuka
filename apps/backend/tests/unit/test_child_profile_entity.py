"""Unit tests for ChildProfile domain entities."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from src.core.domain.entities.child_profile import ChildProfile, ReadingProgress
from src.core.domain.value_objects.language import Language


class TestChildProfile:
    def _make_profile(self, **kwargs) -> ChildProfile:
        defaults = dict(id="cp1", user_id="u1", name="Emma", age=6)
        defaults.update(kwargs)
        return ChildProfile(**defaults)

    def test_active_profile_is_active(self):
        profile = self._make_profile(deleted_at=None)
        assert profile.is_active is True

    def test_soft_deleted_profile_is_not_active(self):
        profile = self._make_profile(deleted_at=datetime.now(UTC))
        assert profile.is_active is False

    def test_age_validation_minimum(self):
        with pytest.raises(ValueError):
            self._make_profile(age=0)

    def test_age_validation_maximum(self):
        with pytest.raises(ValueError):
            self._make_profile(age=19)

    def test_default_language_is_german(self):
        profile = self._make_profile()
        assert Language.DE in profile.preferred_languages


class TestReadingProgress:
    def test_not_completed_by_default(self):
        progress = ReadingProgress(id="rp1", user_id="u1", child_profile_id="cp1", book_id="b1")
        assert progress.is_completed is False

    def test_completed_when_completed_at_set(self):
        progress = ReadingProgress(
            id="rp1",
            user_id="u1",
            child_profile_id="cp1",
            book_id="b1",
            completed_at=datetime.now(UTC),
        )
        assert progress.is_completed is True
