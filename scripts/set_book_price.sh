#!/usr/bin/env bash
# Setzt den Einzelkaufpreis (EUR 2,99) für alle Nicht-Tagesbücher, die noch
# auf 0 stehen (Altbestand vor dem price_single-Fix vom 22.10.).
# Neue Bücher bekommen den Preis automatisch aus BOOK_PRICE_SINGLE_EUR.
#
# Ausführen:  bash scripts/set_book_price.sh
set -euo pipefail

ssh myvps 'docker exec -i kibuka-backend python - <<PY
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from src.infrastructure.config import settings

async def main() -> None:
    eng = create_async_engine(settings.database_url)
    async with eng.begin() as conn:
        r = await conn.execute(
            text(
                "UPDATE books SET price_single = 2.99 "
                "WHERE is_daily_book = false AND price_single = 0"
            )
        )
        print("PREIS: rows updated =", r.rowcount)
        rows = (await conn.execute(
            text("SELECT id, is_daily_book, price_single FROM books")
        )).all()
        for row in rows:
            print("BOOK:", str(row[0])[:8], "| daily:", row[1], "| preis:", row[2])
    await eng.dispose()

asyncio.run(main())
PY'
