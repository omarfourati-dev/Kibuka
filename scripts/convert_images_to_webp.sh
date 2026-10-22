#!/usr/bin/env bash
# Einmalig: konvertiert die PNG-Cover/-Illustrationen bestehender Bücher nach
# WebP (neue Bücher werden seit dem 22.10. direkt als WebP erzeugt) und
# stellt die URLs in der DB um. Idempotent — bereits umgestellte Bilder
# werden übersprungen. Die PNG-Originale bleiben im Bucket liegen.
#
# Ausführen:  bash scripts/convert_images_to_webp.sh
set -euo pipefail

ssh myvps 'docker exec -i kibuka-worker python - <<PY
import asyncio

import boto3
from botocore.config import Config
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from src.adapters.output.ai.image_encoding import to_webp
from src.adapters.output.persistence.models import BookModel, BookPageModel
from src.infrastructure.config import settings

s3 = boto3.client(
    "s3",
    endpoint_url=settings.s3_endpoint_url or None,
    aws_access_key_id=settings.s3_access_key_id,
    aws_secret_access_key=settings.s3_secret_access_key,
    region_name=settings.s3_region,
    config=Config(s3={"addressing_style": "path"}),
)
PREFIX = f"/{settings.s3_bucket}/"


def convert(url: str | None) -> str | None:
    """PNG-URL -> WebP-URL (oder None, wenn nichts zu tun ist)."""
    if not url or not url.endswith(".png") or PREFIX not in url:
        return None
    key = url.split(PREFIX, 1)[1]
    png = s3.get_object(Bucket=settings.s3_bucket, Key=key)["Body"].read()
    webp = to_webp(png)
    new_key = key[: -len(".png")] + ".webp"
    s3.put_object(
        Bucket=settings.s3_bucket, Key=new_key, Body=webp, ContentType="image/webp",
        CacheControl="public, max-age=31536000, immutable",
    )
    print(f"  {key}: {len(png)//1024} KB -> {len(webp)//1024} KB")
    return url[: -len(".png")] + ".webp"


async def main() -> None:
    engine = create_async_engine(settings.database_url)
    maker = async_sessionmaker(engine, expire_on_commit=False)
    changed = 0
    async with maker() as db:
        for book in (await db.execute(select(BookModel))).scalars():
            new = convert(book.cover_image_url)
            if new:
                book.cover_image_url = new
                changed += 1
        for page in (await db.execute(select(BookPageModel))).scalars():
            new = convert(page.illustration_url)
            if new:
                page.illustration_url = new
                changed += 1
        await db.commit()
    await engine.dispose()
    print("FERTIG — umgestellt:", changed)


asyncio.run(main())
PY'
