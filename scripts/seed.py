#!/usr/bin/env python3
"""
Seed script: creates reference + dev data.
Run: uv run python scripts/seed.py
"""
import asyncio
import os
import sys
sys.path.insert(0, 'apps/backend/src')

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql+asyncpg://myapp:myapp@localhost:5432/myapp_dev')

async def seed():
    engine = create_async_engine(DATABASE_URL)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Import models here to avoid import issues
        from adapters.output.persistence.models import UserModel, SpaceModel

        # Check if admin exists
        result = await session.execute(select(UserModel).where(UserModel.email == 'admin@example.com'))
        existing = result.scalar_one_or_none()

        if existing:
            print("Admin user already exists, skipping seed")
            return

        # Create admin user
        import uuid
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

        admin = UserModel(
            id=str(uuid.uuid4()),
            email='admin@example.com',
            name='Admin User',
            hashed_password=pwd_context.hash('admin123'),
            is_active=True,
            is_superuser=True,
        )
        session.add(admin)

        # Create sample space
        space = SpaceModel(
            id=str(uuid.uuid4()),
            name='My First Space',
            slug='my-first-space',
            owner_id=admin.id,
            plan='free',
        )
        session.add(space)

        await session.commit()
        print("✓ Seeded: admin@example.com / admin123")
        print(f"✓ Seeded: space 'My First Space'")

    await engine.dispose()

if __name__ == '__main__':
    asyncio.run(seed())
