"""TDD RED: Ein Abo, dessen Periode abgelaufen ist, darf keinen Zugang mehr
gewähren — auch wenn ein verpasster Webhook den Status nie umgestellt hat."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from src.core.domain.entities.purchase import BookSubscription, BookSubscriptionStatus


def _sub(status: BookSubscriptionStatus, period_end: datetime | None) -> BookSubscription:
    return BookSubscription(
        id="s1", user_id="u1", plan="monthly", status=status, current_period_end=period_end
    )


def test_active_within_period_is_active() -> None:
    sub = _sub(BookSubscriptionStatus.ACTIVE, datetime.now(UTC) + timedelta(days=3))
    assert sub.is_active


def test_active_status_but_expired_period_is_not_active() -> None:
    sub = _sub(BookSubscriptionStatus.ACTIVE, datetime.now(UTC) - timedelta(days=2))
    assert not sub.is_active


def test_unknown_period_end_relies_on_status() -> None:
    assert _sub(BookSubscriptionStatus.TRIALING, None).is_active
    assert not _sub(BookSubscriptionStatus.PAST_DUE, None).is_active


def test_naive_period_end_from_sqlite_is_handled() -> None:
    """SQLite liefert naive Datetimes — der Vergleich darf nicht crashen."""
    naive_future = (datetime.now(UTC) + timedelta(days=3)).replace(tzinfo=None)
    assert _sub(BookSubscriptionStatus.ACTIVE, naive_future).is_active
