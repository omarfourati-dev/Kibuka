from __future__ import annotations

from dataclasses import dataclass

from ...domain.entities.user import User
from ...domain.exceptions.auth import InsufficientPermissionsError
from ...ports.output.i_user_repository import IUserRepository


@dataclass
class ListUsersQuery:
    requesting_user_id: str
    requesting_user_is_admin: bool
    page: int = 1
    page_size: int = 20


class ListUsersUseCase:
    def __init__(self, user_repo: IUserRepository) -> None:
        self._user_repo = user_repo

    async def execute(self, query: ListUsersQuery) -> tuple[list[User], int]:
        if not query.requesting_user_is_admin:
            raise InsufficientPermissionsError("Admin access required")
        return await self._user_repo.list_by_space(
            space_id="",  # Admin lists all users
            page=query.page,
            page_size=query.page_size,
        )
