from __future__ import annotations
import uuid
from dataclasses import dataclass
from typing import Optional
from ...domain.entities.user import User, UserRole, UserStatus
from ...ports.output.i_user_repository import IUserRepository


@dataclass
class OAuthUserInfo:
    google_id: str
    email: str
    name: str
    avatar_url: Optional[str] = None


class OAuthLoginUseCase:
    def __init__(self, user_repo: IUserRepository) -> None:
        self._user_repo = user_repo

    async def execute(self, info: OAuthUserInfo) -> User:
        user = await self._user_repo.get_by_google_id(info.google_id)
        if user:
            return user

        user = await self._user_repo.get_by_email(info.email.lower())
        if user:
            user.google_id = info.google_id
            if info.avatar_url:
                user.avatar_url = info.avatar_url
            return await self._user_repo.save(user)

        new_user = User(
            id=str(uuid.uuid4()),
            email=info.email.lower(),
            name=info.name,
            role=UserRole.MEMBER,
            status=UserStatus.ACTIVE,
            google_id=info.google_id,
            avatar_url=info.avatar_url,
        )
        return await self._user_repo.save(new_user)
