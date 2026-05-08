from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Optional
from ...domain.entities.user import User, UserStatus


class IUserRepository(ABC):
    @abstractmethod
    async def get_by_id(self, user_id: str) -> Optional[User]: ...

    @abstractmethod
    async def get_by_email(self, email: str) -> Optional[User]: ...

    @abstractmethod
    async def get_by_google_id(self, google_id: str) -> Optional[User]: ...

    @abstractmethod
    async def list_by_space(self, space_id: str, page: int = 1, page_size: int = 20) -> tuple[list[User], int]: ...

    @abstractmethod
    async def save(self, user: User) -> User: ...

    @abstractmethod
    async def delete(self, user_id: str) -> None: ...

    @abstractmethod
    async def anonymize(self, user_id: str) -> None: ...
