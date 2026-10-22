"""TDD RED: Sentry meldet Produktionsfehler — auch ohne OpenTelemetry.

Befund 22.10.: configure_telemetry() kehrte ohne OTLP-Endpoint sofort
zurück, ein gesetzter SENTRY_DSN blieb wirkungslos.
"""

from __future__ import annotations

from typing import Any

import pytest
import sentry_sdk

from src.infrastructure import telemetry
from src.infrastructure.config import settings

DSN = "https://key@o1.ingest.sentry.io/1"


@pytest.fixture
def sentry_calls(monkeypatch: pytest.MonkeyPatch) -> list[dict[str, Any]]:
    calls: list[dict[str, Any]] = []
    monkeypatch.setattr(sentry_sdk, "init", lambda **kw: calls.append(kw))
    monkeypatch.setattr(settings, "otel_exporter_otlp_endpoint", "")
    return calls


def test_sentry_starts_without_opentelemetry(
    monkeypatch: pytest.MonkeyPatch, sentry_calls: list[dict[str, Any]]
) -> None:
    monkeypatch.setattr(settings, "sentry_dsn", DSN)

    telemetry.configure_telemetry()

    (call,) = sentry_calls
    assert call["dsn"] == DSN
    assert call["environment"] == settings.environment


def test_sentry_never_sends_personal_data(
    monkeypatch: pytest.MonkeyPatch, sentry_calls: list[dict[str, Any]]
) -> None:
    # Kinder-App: keine IPs, Cookies oder Request-Bodies an Dritte
    monkeypatch.setattr(settings, "sentry_dsn", DSN)

    telemetry.configure_telemetry()

    assert sentry_calls[0]["send_default_pii"] is False


def test_no_dsn_no_sentry(
    monkeypatch: pytest.MonkeyPatch, sentry_calls: list[dict[str, Any]]
) -> None:
    monkeypatch.setattr(settings, "sentry_dsn", "")
    telemetry.configure_telemetry()
    assert sentry_calls == []
