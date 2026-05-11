from __future__ import annotations

from ...domain.entities.user import User
from ...domain.exceptions.auth import TokenInvalidError
from ...ports.output.i_user_repository import IUserRepository


class RefreshTokenUseCase:
    def __init__(self, user_repo: IUserRepository) -> None:
        self._user_repo = user_repo

    async def execute(self, user_id: str) -> User:
        user = await self._user_repo.get_by_id(user_id)
        if not user or not user.is_active:
            raise TokenInvalidError("User not found or inactive")
        return user
