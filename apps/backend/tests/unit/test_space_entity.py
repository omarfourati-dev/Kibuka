"""Unit tests for Space domain entity."""

from datetime import UTC, datetime

from src.core.domain.entities.space import PlanType
from tests.fixtures.factory import SpaceFactory


class TestSpaceIsActive:
    def test_non_deleted_space_is_active(self):
        space = SpaceFactory(deleted_at=None)
        assert space.is_active is True

    def test_soft_deleted_space_is_not_active(self):
        space = SpaceFactory(deleted_at=datetime.now(UTC))
        assert space.is_active is False


class TestSpaceFactory:
    def test_factory_creates_unique_ids(self):
        s1 = SpaceFactory()
        s2 = SpaceFactory()
        assert s1.id != s2.id

    def test_factory_creates_unique_slugs(self):
        s1 = SpaceFactory()
        s2 = SpaceFactory()
        assert s1.slug != s2.slug

    def test_factory_default_plan_is_free(self):
        space = SpaceFactory()
        assert space.plan == PlanType.FREE

    def test_factory_plan_override(self):
        space = SpaceFactory(plan=PlanType.PRO)
        assert space.plan == PlanType.PRO
