"""TDD RED: POST /api/v1/contracts/cancellation — Kündigungsbutton (§ 312k BGB).

Öffentlich (kein Login), gedrosselt pro IP, und die Antwort verrät nie, ob
zu einer E-Mail-Adresse ein Konto oder Abo existiert.
"""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from src.adapters.input.api.v1.contracts import (
    cancellation_rate_limit,
    get_submit_cancellation,
)
from src.adapters.input.api.v1.contracts import router as contracts_router
from src.core.domain.entities.cancellation import (
    CancellationOutcome,
    CancellationRequest,
    ContractCancellation,
)

RECEIVED = datetime(2026, 10, 22, 18, 30, tzinfo=UTC)


class FakeSubmit:
    def __init__(self, outcome: CancellationOutcome = CancellationOutcome.SCHEDULED) -> None:
        self.outcome = outcome
        self.requests: list[CancellationRequest] = []

    async def execute(self, request: CancellationRequest) -> ContractCancellation:
        self.requests.append(request)
        return ContractCancellation(
            id="11111111-2222-3333-4444-555555555555",
            name=request.name,
            email=request.email.strip().lower(),
            kind=request.kind,
            reason=request.reason,
            contract_reference=request.contract_reference,
            received_at=RECEIVED,
            outcome=self.outcome,
            user_id="u1" if self.outcome == CancellationOutcome.SCHEDULED else None,
            stripe_subscription_id="sub_123",
            effective_at=datetime(2026, 11, 22, tzinfo=UTC),
        )


def _client(submit: FakeSubmit, limited: bool = False) -> TestClient:
    app = FastAPI()
    app.include_router(contracts_router, prefix="/api/v1")
    app.dependency_overrides[get_submit_cancellation] = lambda: submit

    async def _limit() -> None:
        if limited:
            raise HTTPException(status_code=429, detail="Too many requests")

    app.dependency_overrides[cancellation_rate_limit] = _limit
    return TestClient(app, base_url="https://testserver")


VALID = {
    "name": "Omar Fourati",
    "email": "omar@example.com",
    "kind": "ordinary",
}


def test_cancellation_works_without_login_and_returns_a_receipt() -> None:
    submit = FakeSubmit()
    response = _client(submit).post("/api/v1/contracts/cancellation", json=VALID)

    assert response.status_code == 201
    body = response.json()
    assert body["reference"] == "11111111-2222-3333-4444-555555555555"
    assert body["received_at"].startswith("2026-10-22T18:30")
    assert body["name"] == "Omar Fourati"
    assert body["email"] == "omar@example.com"
    assert body["kind"] == "ordinary"
    assert len(submit.requests) == 1


def test_receipt_does_not_reveal_whether_a_contract_exists() -> None:
    known = _client(FakeSubmit(CancellationOutcome.SCHEDULED)).post(
        "/api/v1/contracts/cancellation", json=VALID
    )
    unknown = _client(FakeSubmit(CancellationOutcome.NO_ACTIVE_CONTRACT)).post(
        "/api/v1/contracts/cancellation", json=VALID
    )

    assert known.status_code == unknown.status_code == 201
    assert set(known.json()) == set(unknown.json())
    for leaky in ("outcome", "user_id", "stripe_subscription_id", "effective_at"):
        assert leaky not in known.json()


def test_extraordinary_cancellation_requires_a_reason() -> None:
    submit = FakeSubmit()
    client = _client(submit)

    missing = client.post("/api/v1/contracts/cancellation", json={**VALID, "kind": "extraordinary"})
    blank = client.post(
        "/api/v1/contracts/cancellation",
        json={**VALID, "kind": "extraordinary", "reason": "   "},
    )
    ok = client.post(
        "/api/v1/contracts/cancellation",
        json={**VALID, "kind": "extraordinary", "reason": "Umzug"},
    )

    assert missing.status_code == 422
    assert blank.status_code == 422
    assert ok.status_code == 201
    assert submit.requests[-1].reason == "Umzug"


def test_rejects_invalid_input() -> None:
    client = _client(FakeSubmit())
    for bad in (
        {**VALID, "email": "keine-mail"},
        {**VALID, "name": "  "},
        {**VALID, "name": "x" * 201},
        {**VALID, "kind": "sofort"},
        {**VALID, "reason": "x" * 2001},
        {**VALID, "contract_reference": "x" * 121},
    ):
        assert client.post("/api/v1/contracts/cancellation", json=bad).status_code == 422, bad


def test_optional_fields_are_passed_through_trimmed() -> None:
    submit = FakeSubmit()
    _client(submit).post(
        "/api/v1/contracts/cancellation",
        json={**VALID, "name": "  Omar  ", "contract_reference": " sub_123 "},
    )

    (request,) = submit.requests
    assert request.name == "Omar"
    assert request.contract_reference == "sub_123"


def test_rate_limit_blocks_floods() -> None:
    response = _client(FakeSubmit(), limited=True).post(
        "/api/v1/contracts/cancellation", json=VALID
    )
    assert response.status_code == 429
