"""Unit tests for LoginUserUseCase."""

from datetime import datetime
from unittest.mock import AsyncMock

import pytest

from src.core.domain.entities.user import UserStatus
from src.core.domain.exceptions.auth import AuthenticationError, InvalidCredentialsError
from src.core.domain.exceptions.user import UserSuspendedError
from src.core.use_cases.auth.login_user import LoginCommand, LoginUserUseCase
from tests.fixtures.factory import UserFactory


def _verify_ok(_plain, _hashed) -> bool:
    return True


def _verify_fail(_plain, _hashed) -> bool:
    return False


@pytest.fixture
def user_repo():
    return AsyncMock()


@pytest.fixture
def use_case(user_repo):
    return LoginUserUseCase(user_repo=user_repo)


class TestLoginSuccess:
    @pytest.mark.asyncio
    async def test_valid_credentials_return_user(self, use_case, user_repo):
        user = UserFactory(email="user@example.com", hashed_password="$2b$12$hash")
        user_repo.get_by_email.return_value = user
        cmd = LoginCommand(email="user@example.com", password="correct")
        result = await use_case.execute(cmd, _verify_ok)
        assert result.email == "user@example.com"

    @pytest.mark.asyncio
    async def test_email_lowercased_before_lookup(self, use_case, user_repo):
        user = UserFactory(email="user@example.com", hashed_password="$2b$12$hash")
        user_repo.get_by_email.return_value = user
        cmd = LoginCommand(email="USER@EXAMPLE.COM", password="correct")
        await use_case.execute(cmd, _verify_ok)
        user_repo.get_by_email.assert_awaited_with("user@example.com")


class TestLoginFailure:
    @pytest.mark.asyncio
    async def test_unknown_email_raises(self, use_case, user_repo):
        user_repo.get_by_email.return_value = None
        cmd = LoginCommand(email="nobody@example.com", password="secret")
        with pytest.raises(InvalidCredentialsError):
            await use_case.execute(cmd, _verify_ok)

    @pytest.mark.asyncio
    async def test_wrong_password_raises(self, use_case, user_repo):
        user = UserFactory(email="user@example.com", hashed_password="$2b$12$hash")
        user_repo.get_by_email.return_value = user
        cmd = LoginCommand(email="user@example.com", password="wrong")
        with pytest.raises(InvalidCredentialsError):
            await use_case.execute(cmd, _verify_fail)

    @pytest.mark.asyncio
    async def test_suspended_user_raises(self, use_case, user_repo):
        user = UserFactory(
            email="user@example.com",
            hashed_password="$2b$12$hash",
            status=UserStatus.SUSPENDED,
        )
        user_repo.get_by_email.return_value = user
        cmd = LoginCommand(email="user@example.com", password="correct")
        with pytest.raises(UserSuspendedError):
            await use_case.execute(cmd, _verify_ok)

    @pytest.mark.asyncio
    async def test_deleted_user_raises(self, use_case, user_repo):
        user = UserFactory(
            email="user@example.com",
            hashed_password="$2b$12$hash",
            deleted_at=datetime.utcnow(),
        )
        user_repo.get_by_email.return_value = user
        cmd = LoginCommand(email="user@example.com", password="correct")
        with pytest.raises(AuthenticationError):
            await use_case.execute(cmd, _verify_ok)

    @pytest.mark.asyncio
    async def test_user_without_password_raises(self, use_case, user_repo):
        user = UserFactory(email="user@example.com", hashed_password=None)
        user_repo.get_by_email.return_value = user
        cmd = LoginCommand(email="user@example.com", password="anything")
        with pytest.raises(InvalidCredentialsError):
            await use_case.execute(cmd, _verify_ok)
