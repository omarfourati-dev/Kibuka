from __future__ import annotations
from ...domain.exceptions.user import UserNotFoundError
from ...ports.output.i_user_repository import IUserRepository


class DeleteUserUseCase:
    """GDPR Art. 17 — Right to Erasure: soft-delete + anonymize."""
    def __init__(self, user_repo: IUserRepository) -> None:
        self._user_repo = user_repo

    async def execute(self, user_id: str) -> None:
        user = await self._user_repo.get_by_id(user_id)
        if not user:
            raise UserNotFoundError(f"User {user_id} not found")
        await self._user_repo.anonymize(user_id)
