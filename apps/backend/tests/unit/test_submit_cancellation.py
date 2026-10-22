"""TDD RED: Kündigungsbutton nach § 312k BGB.

Wer ein Abo abgeschlossen hat, muss es ohne Login über "Verträge hier
kündigen" beenden können. Der Eingang wird immer gespeichert und in
Textform (E-Mail) bestätigt — egal ob zur Adresse ein Abo existiert.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

import pytest

from src.core.domain.entities.cancellation import (
    CancellationKind,
    CancellationOutcome,
    CancellationRequest,
    ContractCancellation,
)
from src.core.domain.entities.purchase import BookSubscription, BookSubscriptionStatus
from src.core.domain.entities.user import User, UserRole, UserStatus
from src.core.use_cases.billing.submit_cancellation import SubmitCancellation

PERIOD_END = datetime(2026, 11, 22, 12, 0, tzinfo=UTC)


class FakeCancellations:
    def __init__(self) -> None:
        self.saved: list[ContractCancellation] = []

    async def add(self, cancellation: ContractCancellation) -> ContractCancellation:
        self.saved.append(cancellation)
        return cancellation


class FakeUsers:
    def __init__(self, users: list[User] | None = None) -> None:
        self.users = {u.email: u for u in users or []}
        self.lookups: list[str] = []

    async def get_by_email(self, email: str) -> User | None:
        self.lookups.append(email)
        return self.users.get(email)


class FakeSubscriptions:
    def __init__(self, subs: list[BookSubscription] | None = None) -> None:
        self.subs = subs or []

    async def get_current_for_user(self, user_id: str) -> BookSubscription | None:
        mine = [s for s in self.subs if s.user_id == user_id]
        return mine[0] if mine else None


class FakeCanceller:
    def __init__(self, fail: bool = False) -> None:
        self.fail = fail
        self.calls: list[str] = []

    async def cancel_at_period_end(self, stripe_subscription_id: str) -> datetime | None:
        self.calls.append(stripe_subscription_id)
        if self.fail:
            raise RuntimeError("stripe down")
        return PERIOD_END


class FakeEmail:
    def __init__(self, fail: bool = False) -> None:
        self.fail = fail
        self.sent: list[dict[str, Any]] = []

    async def send(self, to: str, subject: str, template: str, context: dict[str, object]) -> None:
        if self.fail:
            raise OSError("smtp down")
        self.sent.append({"to": to, "subject": subject, "template": template, "context": context})


def _user(email: str = "omar@example.com") -> User:
    return User(id="u1", email=email, name="Omar", role=UserRole.MEMBER, status=UserStatus.ACTIVE)


def _sub(status: BookSubscriptionStatus = BookSubscriptionStatus.ACTIVE) -> BookSubscription:
    return BookSubscription(
        id="s1",
        user_id="u1",
        plan="monthly",
        status=status,
        stripe_subscription_id="sub_123",
        stripe_customer_id="cus_1",
        current_period_end=datetime.now(UTC) + timedelta(days=20),
    )


def _request(
    email: str = "omar@example.com",
    kind: CancellationKind = CancellationKind.ORDINARY,
    reason: str | None = None,
) -> CancellationRequest:
    return CancellationRequest(
        name="Omar Fourati",
        email=email,
        kind=kind,
        reason=reason,
        contract_reference=None,
    )


def _use_case(
    users: FakeUsers | None = None,
    subs: FakeSubscriptions | None = None,
    canceller: FakeCanceller | None = None,
    email: FakeEmail | None = None,
    cancellations: FakeCancellations | None = None,
) -> tuple[SubmitCancellation, FakeCancellations, FakeCanceller, FakeEmail]:
    cancellations = cancellations or FakeCancellations()
    canceller = canceller or FakeCanceller()
    email = email or FakeEmail()
    use_case = SubmitCancellation(
        cancellations=cancellations,
        users=users or FakeUsers([_user()]),
        subscriptions=subs or FakeSubscriptions([_sub()]),
        canceller=canceller,
        email=email,
    )
    return use_case, cancellations, canceller, email


@pytest.mark.asyncio
async def test_ordinary_cancellation_ends_active_subscription_at_period_end() -> None:
    use_case, saved, canceller, _ = _use_case()

    result = await use_case.execute(_request())

    assert canceller.calls == ["sub_123"]
    assert result.outcome == CancellationOutcome.SCHEDULED
    assert result.effective_at == PERIOD_END
    assert result.user_id == "u1"
    assert result.stripe_subscription_id == "sub_123"
    assert saved.saved == [result]


@pytest.mark.asyncio
async def test_records_receipt_time_and_reference() -> None:
    use_case, _, _, _ = _use_case()
    before = datetime.now(UTC)

    result = await use_case.execute(_request())

    assert before <= result.received_at <= datetime.now(UTC)
    assert len(result.id) == 36  # UUID als Vorgangsnummer


@pytest.mark.asyncio
async def test_email_lookup_ignores_case_and_whitespace() -> None:
    users = FakeUsers([_user()])
    use_case, _, canceller, _ = _use_case(users=users)

    result = await use_case.execute(_request(email="  Omar@Example.COM "))

    assert users.lookups == ["omar@example.com"]
    assert result.email == "omar@example.com"
    assert canceller.calls == ["sub_123"]


@pytest.mark.asyncio
async def test_unknown_email_is_recorded_and_confirmed_without_touching_stripe() -> None:
    use_case, saved, canceller, email = _use_case(users=FakeUsers([]))

    result = await use_case.execute(_request(email="fremd@example.com"))

    assert result.outcome == CancellationOutcome.NO_ACTIVE_CONTRACT
    assert canceller.calls == []
    assert len(saved.saved) == 1
    # § 312k Abs. 4: Eingangsbestätigung geht trotzdem raus
    assert [m["to"] for m in email.sent] == ["fremd@example.com"]


@pytest.mark.asyncio
async def test_canceled_subscription_is_not_cancelled_again() -> None:
    subs = FakeSubscriptions([_sub(BookSubscriptionStatus.CANCELED)])
    use_case, _, canceller, _ = _use_case(subs=subs)

    result = await use_case.execute(_request())

    assert result.outcome == CancellationOutcome.NO_ACTIVE_CONTRACT
    assert canceller.calls == []


@pytest.mark.asyncio
async def test_extraordinary_cancellation_goes_to_manual_review() -> None:
    use_case, saved, canceller, _ = _use_case()

    result = await use_case.execute(
        _request(kind=CancellationKind.EXTRAORDINARY, reason="Umzug ins Ausland")
    )

    # Fristlose Kündigung braucht eine menschliche Prüfung des Grundes
    assert result.outcome == CancellationOutcome.MANUAL_REVIEW
    assert result.reason == "Umzug ins Ausland"
    assert canceller.calls == []
    assert saved.saved == [result]


@pytest.mark.asyncio
async def test_stripe_failure_is_recorded_not_raised() -> None:
    use_case, saved, _, email = _use_case(canceller=FakeCanceller(fail=True))

    result = await use_case.execute(_request())

    # Die Kündigung ist trotzdem zugegangen — sie darf nicht verloren gehen
    assert result.outcome == CancellationOutcome.FAILED
    assert saved.saved == [result]
    assert len(email.sent) == 1


@pytest.mark.asyncio
async def test_confirmation_email_contains_what_the_law_requires() -> None:
    use_case, _, _, email = _use_case()

    result = await use_case.execute(_request())

    (mail,) = email.sent
    assert mail["to"] == "omar@example.com"
    assert mail["template"] == "contract_cancellation"
    ctx = mail["context"]
    assert ctx["reference"] == result.id
    assert ctx["received_at"] == result.received_at
    assert ctx["name"] == "Omar Fourati"
    assert ctx["kind"] == "ordinary"
    assert ctx["effective_at"] == PERIOD_END


@pytest.mark.asyncio
async def test_email_failure_does_not_lose_the_cancellation() -> None:
    use_case, saved, canceller, _ = _use_case(email=FakeEmail(fail=True))

    result = await use_case.execute(_request())

    assert result.outcome == CancellationOutcome.SCHEDULED
    assert canceller.calls == ["sub_123"]
    assert saved.saved == [result]
