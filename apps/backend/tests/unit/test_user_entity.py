"""Unit tests for User domain entity."""

from datetime import UTC, datetime

from src.core.domain.entities.user import UserRole, UserStatus
from tests.fixtures.factory import UserFactory


class TestUserIsActive:
    def test_active_user_is_active(self):
        user = UserFactory(status=UserStatus.ACTIVE, deleted_at=None)
        assert user.is_active is True

    def test_inactive_user_is_not_active(self):
        user = UserFactory(status=UserStatus.INACTIVE, deleted_at=None)
        assert user.is_active is False

    def test_suspended_user_is_not_active(self):
        user = UserFactory(status=UserStatus.SUSPENDED, deleted_at=None)
        assert user.is_active is False

    def test_soft_deleted_user_is_not_active(self):
        user = UserFactory(status=UserStatus.ACTIVE, deleted_at=datetime.now(UTC))
        assert user.is_active is False

    def test_soft_deleted_inactive_user_is_not_active(self):
        user = UserFactory(status=UserStatus.INACTIVE, deleted_at=datetime.now(UTC))
        assert user.is_active is False


class TestUserIsAdmin:
    def test_owner_is_admin(self):
        user = UserFactory(role=UserRole.OWNER)
        assert user.is_admin is True

    def test_admin_is_admin(self):
        user = UserFactory(role=UserRole.ADMIN)
        assert user.is_admin is True

    def test_member_is_not_admin(self):
        user = UserFactory(role=UserRole.MEMBER)
        assert user.is_admin is False

    def test_viewer_is_not_admin(self):
        user = UserFactory(role=UserRole.VIEWER)
        assert user.is_admin is False


class TestUserFactory:
    def test_factory_creates_unique_ids(self):
        u1 = UserFactory()
        u2 = UserFactory()
        assert u1.id != u2.id

    def test_factory_creates_unique_emails(self):
        u1 = UserFactory()
        u2 = UserFactory()
        assert u1.email != u2.email

    def test_factory_default_role_is_member(self):
        user = UserFactory()
        assert user.role == UserRole.MEMBER

    def test_factory_default_status_is_active(self):
        user = UserFactory()
        assert user.status == UserStatus.ACTIVE
