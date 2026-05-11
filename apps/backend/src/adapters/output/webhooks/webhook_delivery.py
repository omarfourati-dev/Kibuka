"""
Outgoing webhook delivery with exponential backoff + jitter + circuit breaker.
Called from ARQ background job queue.
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import random
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx

from ....adapters.output.persistence.models import OutgoingWebhookModel

CIRCUIT_OPEN_DURATION_MINUTES = 30
MAX_RETRIES = 5
BASE_DELAY_SECONDS = 1.0


def _sign_payload(payload: bytes, secret: str) -> str:
    return hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()


async def deliver_webhook(
    webhook_id: str,
    event_type: str,
    payload: dict[str, Any],
    session: Any,
) -> bool:
    """
    Delivers one webhook event. Returns True on success.
    On repeated failures, opens the circuit breaker.
    """
    from sqlalchemy import select

    result = await session.execute(
        select(OutgoingWebhookModel).where(OutgoingWebhookModel.id == webhook_id)
    )
    webhook = result.scalar_one_or_none()
    if not webhook or not webhook.is_active:
        return False

    if webhook.circuit_open_until and webhook.circuit_open_until > datetime.now(UTC):
        return False

    payload_bytes = json.dumps({"event": event_type, "data": payload}).encode()
    headers = {
        "Content-Type": "application/json",
        "X-Webhook-Event": event_type,
    }
    if webhook.secret:
        headers["X-Webhook-Signature"] = _sign_payload(payload_bytes, webhook.secret)

    for attempt in range(MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(webhook.url, content=payload_bytes, headers=headers)
                if response.is_success:
                    webhook.failure_count = 0
                    webhook.circuit_open_until = None
                    await session.flush()
                    return True
        except Exception:
            pass

        delay = BASE_DELAY_SECONDS * (2**attempt) + random.uniform(0, 1)
        await asyncio.sleep(delay)

    webhook.failure_count = (webhook.failure_count or 0) + 1
    if webhook.failure_count >= 5:
        webhook.circuit_open_until = datetime.now(UTC) + timedelta(
            minutes=CIRCUIT_OPEN_DURATION_MINUTES
        )

    await session.flush()
    return False
