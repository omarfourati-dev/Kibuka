"""Die Eingangsbestätigung (§ 312k Abs. 4 BGB) muss Datum und Uhrzeit des
Zugangs, den Inhalt der Kündigung und das Vertragsende nennen."""

from __future__ import annotations

from datetime import UTC, datetime

from jinja2 import Environment, PackageLoader, select_autoescape

from src.core.use_cases.billing.submit_cancellation import CONFIRMATION_TEMPLATE


def _render(**overrides: object) -> str:
    # Dieselbe Umgebung wie SmtpEmailService
    env = Environment(
        loader=PackageLoader("src", "templates/email"), autoescape=select_autoescape(["html"])
    )
    context: dict[str, object] = {
        "reference": "11111111-2222-3333-4444-555555555555",
        "received_at": datetime(2026, 10, 22, 18, 30, 5, tzinfo=UTC),
        "name": "Omar",
        "kind": "ordinary",
        "reason": None,
        "contract_reference": None,
        "effective_at": datetime(2026, 11, 22, tzinfo=UTC),
    }
    context.update(overrides)
    return env.get_template(f"{CONFIRMATION_TEMPLATE}.html").render(**context)


def test_confirmation_names_receipt_time_reference_and_end_date() -> None:
    html = _render()
    assert "11111111-2222-3333-4444-555555555555" in html
    assert "22.10.2026 um 18:30:05" in html
    assert "Ordentliche Kündigung" in html
    assert "22.11.2026" in html


def test_extraordinary_confirmation_states_reason_and_review() -> None:
    html = _render(kind="extraordinary", reason="Umzug", effective_at=None)
    assert "Außerordentliche" in html
    assert "Umzug" in html
    assert "prüfen" in html


def test_user_input_is_escaped() -> None:
    html = _render(name="<script>x</script>")
    assert "<script>x</script>" not in html
    assert "&lt;script&gt;" in html


def test_unmatched_confirmation_explains_without_echoing_input() -> None:
    html = _render(matched=False, name=None, reason=None, contract_reference=None)
    assert "11111111-2222-3333-4444-555555555555" in html
    assert "kein Kibuka-Konto" in html
    assert "Hallo ," not in html
