#!/usr/bin/env bash
# Gleicht bezahlte Stripe-Checkout-Sessions mit der Kauf-Tabelle ab und
# bucht fehlende Freischaltungen nach (z.B. wenn ein Webhook fehlschlug).
# Stripe ist dabei die Quelle der Wahrheit (payment_status == "paid").
# Idempotent — bereits verbuchte Käufe werden übersprungen.
#
# Ausführen:  bash scripts/reconcile_stripe_purchases.sh
set -euo pipefail

ssh myvps 'docker exec -i kibuka-backend python - <<PY
import asyncio
import uuid

import stripe
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from src.adapters.output.persistence.repositories.book_repository import SqlBookRepository
from src.core.domain.entities.purchase import BookPurchase, PurchaseType
from src.infrastructure.config import settings

stripe.api_key = settings.stripe_secret_key


async def main() -> None:
    engine = create_async_engine(settings.database_url)
    maker = async_sessionmaker(engine, expire_on_commit=False)
    sessions = stripe.checkout.Session.list(limit=50)
    async with maker() as db:
        repo = SqlBookRepository(session=db)
        granted = 0
        for s in sessions.data:
            d = s.to_dict()
            if d.get("payment_status") != "paid":
                continue
            meta = d.get("metadata") or {}
            book_id, user_id = meta.get("book_id"), meta.get("user_id")
            if not book_id or not user_id:
                continue
            if await repo.is_purchased_by_user(book_id, user_id):
                continue
            await repo.record_purchase(
                BookPurchase(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    book_id=book_id,
                    purchase_type=PurchaseType.SINGLE,
                    amount=int(d.get("amount_total") or 0) / 100,
                    stripe_payment_intent_id=str(d.get("payment_intent") or ""),
                )
            )
            granted += 1
            print("NACHGEBUCHT:", book_id, "fuer User", user_id)
        await db.commit()
        print("FERTIG — nachgebucht:", granted)
    await engine.dispose()


asyncio.run(main())
PY'
