from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Optional
from ...domain.entities.conversation import Conversation, ChatMessage


class IConversationRepository(ABC):
    @abstractmethod
    async def get_by_id(self, conversation_id: str) -> Optional[Conversation]: ...

    @abstractmethod
    async def list_by_space(self, space_id: str, user_id: str) -> list[Conversation]: ...

    @abstractmethod
    async def save(self, conversation: Conversation) -> Conversation: ...

    @abstractmethod
    async def add_message(self, message: ChatMessage) -> ChatMessage: ...

    @abstractmethod
    async def delete(self, conversation_id: str) -> None: ...
