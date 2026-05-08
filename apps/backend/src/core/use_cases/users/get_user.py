from __future__ import annotations
from typing import Optional
from ...domain.entities.user import User
from ...domain.exceptions.user import UserNotFoundError
from ...ports.output.i_user_repository import IUserRepository


class GetUserUseCase:
    def __init__(self, user_repo: IUserRepository) -> None:
        self._user_repo = user_repo

    async def execute(self, user_id: str) -> User:
        user = await self._user_repo.get_by_id(user_id)
        if not user:
            raise UserNotFoundError(f"User {user_id} not found")
        return user
