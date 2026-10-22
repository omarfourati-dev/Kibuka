"""Settings validation tests — written FIRST (TDD RED phase).

Production must never run with the default JWT signing secret.
"""

from __future__ import annotations

import pytest

from src.infrastructure.config import DEFAULT_SECRET_KEY, Settings

_STRONG_KEY = "x" * 48


class TestSecretKeyValidation:
    def test_production_rejects_default_secret(self) -> None:
        with pytest.raises(ValueError, match="SECRET_KEY"):
            Settings(environment="production", secret_key=DEFAULT_SECRET_KEY)

    def test_production_accepts_strong_secret(self) -> None:
        settings = Settings(environment="production", secret_key=_STRONG_KEY)
        assert settings.secret_key == _STRONG_KEY

    def test_development_tolerates_default_secret(self) -> None:
        settings = Settings(environment="development", secret_key=DEFAULT_SECRET_KEY)
        assert settings.secret_key == DEFAULT_SECRET_KEY


class TestBookPricing:
    def test_book_price_single_has_sane_default(self) -> None:
        """Generierte Bücher dürfen nie gratis in den Shop fallen (0.0-Bug)."""
        settings = Settings(environment="development")
        assert settings.book_price_single_eur == 2.99

    def test_book_price_single_is_configurable(self) -> None:
        settings = Settings(environment="development", book_price_single_eur=3.49)
        assert settings.book_price_single_eur == 3.49
