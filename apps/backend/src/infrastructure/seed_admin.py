"""Seed an initial admin (OWNER) account — idempotent, run inside the backend
container:

    docker exec -e ADMIN_EMAIL=... -e ADMIN_INITIAL_PASSWORD=... \
        kibuka-backend python -m src.infrastructure.seed_admin

The password arrives via environment variable and is never printed.
"""

from __future__ import annotations

import asyncio
import os
import sys
import uuid
from typing import Protocol

from ..core.domain.entities.user import User, UserRole, UserStatus
from .security import hash_password


class _UserRepo(Protocol):
    async def get_by_email(self, email: str) -> User | None: ...

    async def save(self, user: User) -> User: ...


async def ensure_admin(repo: _UserRepo, email: str, password: str) -> str:
    """Create an active OWNER account unless the email already exists.

    Returns "created" or "exists"; never overwrites existing credentials.
    """
    existing = await repo.get_by_email(email)
    if existing is not None:
        return "exists"

    await repo.save(
        User(
            id=str(uuid.uuid4()),
            email=email,
            name="Admin",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE,
            hashed_password=hash_password(password),
        )
    )
    return "created"


async def _main() -> None:
    from ..adapters.output.persistence.repositories.user_repository import SqlUserRepository
    from .database import async_session_maker

    email = os.environ.get("ADMIN_EMAIL", "")
    password = os.environ.get("ADMIN_INITIAL_PASSWORD", "")
    if not email or not password:
        sys.exit("ADMIN_EMAIL und ADMIN_INITIAL_PASSWORD müssen gesetzt sein.")

    async with async_session_maker() as session:
        result = await ensure_admin(SqlUserRepository(session=session), email, password)
        await session.commit()

    print(f"Admin {email}: {result}")


if __name__ == "__main__":
    asyncio.run(_main())
