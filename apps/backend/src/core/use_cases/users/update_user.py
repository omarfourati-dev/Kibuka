from __future__ import annotations
from dataclasses import dataclass
from typing import Optional
from ...domain.entities.user import User
from ...domain.exceptions.user import UserNotFoundError
from ...ports.output.i_user_repository import IUserRepository


@dataclass
class UpdateUserCommand:
    user_id: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None


class UpdateUserUseCase:
    def __init__(self, user_repo: IUserRepository) -> None:
        self._user_repo = user_repo

    async def execute(self, command: UpdateUserCommand) -> User:
        user = await self._user_repo.get_by_id(command.user_id)
        if not user:
            raise UserNotFoundError(f"User {command.user_id} not found")

        if command.name is not None:
            user.name = command.name.strip()
        if command.avatar_url is not None:
            user.avatar_url = command.avatar_url

        return await self._user_repo.save(user)
