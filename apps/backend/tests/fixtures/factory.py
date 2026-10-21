"""factory_boy factories for test data generation."""

from __future__ import annotations

import uuid

import factory
from factory import Factory

from src.core.domain.entities.space import PlanType, Space
from src.core.domain.entities.user import User, UserRole, UserStatus


class UserFactory(Factory):
    class Meta:
        model = User

    id = factory.LazyFunction(lambda: str(uuid.uuid4()))
    email = factory.Sequence(lambda n: f"user{n}@example.com")
    name = factory.Sequence(lambda n: f"User {n}")
    role = UserRole.MEMBER
    status = UserStatus.ACTIVE
    hashed_password = "$2b$12$placeholder_hash"


class SpaceFactory(Factory):
    class Meta:
        model = Space

    id = factory.LazyFunction(lambda: str(uuid.uuid4()))
    name = factory.Sequence(lambda n: f"Space {n}")
    slug = factory.Sequence(lambda n: f"space-{n}")
    owner_id = factory.LazyFunction(lambda: str(uuid.uuid4()))
    plan = PlanType.FREE
