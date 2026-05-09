"""Unit tests for RegisterUserUseCase — pure domain logic, no DB, no HTTP."""

from unittest.mock import AsyncMock

import pytest

from src.core.domain.entities.user import UserRole, UserStatus
from src.core.domain.exceptions.user import InvalidEmailError, UserAlreadyExistsError
from src.core.use_cases.auth.register_user import RegisterUserCommand, RegisterUserUseCase
from tests.fixtures.factory import UserFactory


@pytest.fixture
def user_repo():
    repo = AsyncMock()
    repo.get_by_email.return_value = None
    repo.save.side_effect = lambda user: user
    return repo


@pytest.fixture
def email_service():
    svc = AsyncMock()
    svc.send.return_value = None
    return svc


@pytest.fixture
def use_case(user_repo, email_service):
    return RegisterUserUseCase(user_repo=user_repo, email_service=email_service)


class TestRegisterUserSuccess:
    @pytest.mark.asyncio
    async def test_returns_user_with_correct_email(self, use_case, user_repo):
        cmd = RegisterUserCommand(email="new@example.com", name="Alice", password="secret")
        user = await use_case.execute(cmd)
        assert user.email == "new@example.com"

    @pytest.mark.asyncio
    async def test_returns_user_with_correct_name(self, use_case):
        cmd = RegisterUserCommand(email="new@example.com", name="Alice", password="secret")
        user = await use_case.execute(cmd)
        assert user.name == "Alice"

    @pytest.mark.asyncio
    async def test_new_user_has_member_role(self, use_case):
        cmd = RegisterUserCommand(email="new@example.com", name="Alice", password="secret")
        user = await use_case.execute(cmd)
        assert user.role == UserRole.MEMBER

    @pytest.mark.asyncio
    async def test_new_user_is_active(self, use_case):
        cmd = RegisterUserCommand(email="new@example.com", name="Alice", password="secret")
        user = await use_case.execute(cmd)
        assert user.status == UserStatus.ACTIVE

    @pytest.mark.asyncio
    async def test_email_normalized_to_lowercase(self, use_case):
        cmd = RegisterUserCommand(email="NEW@EXAMPLE.COM", name="Alice", password="secret")
        user = await use_case.execute(cmd)
        assert user.email == "new@example.com"

    @pytest.mark.asyncio
    async def test_welcome_email_sent(self, use_case, email_service):
        cmd = RegisterUserCommand(email="new@example.com", name="Alice", password="secret")
        await use_case.execute(cmd)
        email_service.send.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_user_persisted(self, use_case, user_repo):
        cmd = RegisterUserCommand(email="new@example.com", name="Alice", password="secret")
        await use_case.execute(cmd)
        user_repo.save.assert_awaited_once()


class TestRegisterUserFailure:
    @pytest.mark.asyncio
    async def test_duplicate_email_raises(self, use_case, user_repo):
        existing = UserFactory(email="taken@example.com")
        user_repo.get_by_email.return_value = existing
        cmd = RegisterUserCommand(email="taken@example.com", name="Alice", password="secret")
        with pytest.raises(UserAlreadyExistsError):
            await use_case.execute(cmd)

    @pytest.mark.asyncio
    async def test_invalid_email_raises(self, use_case):
        cmd = RegisterUserCommand(email="notanemail", name="Alice", password="secret")
        with pytest.raises(InvalidEmailError):
            await use_case.execute(cmd)

    @pytest.mark.asyncio
    async def test_no_email_sent_on_duplicate(self, use_case, user_repo, email_service):
        existing = UserFactory(email="taken@example.com")
        user_repo.get_by_email.return_value = existing
        cmd = RegisterUserCommand(email="taken@example.com", name="Alice", password="secret")
        with pytest.raises(UserAlreadyExistsError):
            await use_case.execute(cmd)
        email_service.send.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_whitespace_trimmed_from_name(self, use_case):
        cmd = RegisterUserCommand(email="new@example.com", name="  Alice  ", password="secret")
        user = await use_case.execute(cmd)
        assert user.name == "Alice"
