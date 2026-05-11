from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from ...domain.entities.user import User, UserStatus
from ...domain.exceptions.auth import AuthenticationError, InvalidCredentialsError
from ...domain.exceptions.user import UserSuspendedError
from ...ports.output.i_user_repository import IUserRepository


@dataclass
class LoginCommand:
    email: str
    password: str


class LoginUserUseCase:
    def __init__(self, user_repo: IUserRepository) -> None:
        self._user_repo = user_repo

    async def execute(
        self, command: LoginCommand, verify_password_fn: Callable[[str, str], bool]
    ) -> User:
        user = await self._user_repo.get_by_email(command.email.lower().strip())
        if not user or not user.hashed_password:
            raise InvalidCredentialsError("Invalid email or password")

        if not verify_password_fn(command.password, user.hashed_password):
            raise InvalidCredentialsError("Invalid email or password")

        if user.status == UserStatus.SUSPENDED:
            raise UserSuspendedError("Account is suspended")

        if not user.is_active:
            raise AuthenticationError("Account is not active")

        return user
