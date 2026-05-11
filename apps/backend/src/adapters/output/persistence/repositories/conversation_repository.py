from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from .....core.domain.entities.conversation import ChatMessage, Conversation, MessageRole
from .....core.ports.output.i_conversation_repository import IConversationRepository
from ..models import ChatMessageModel, ConversationModel


class SqlConversationRepository(IConversationRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, conversation_id: str) -> Conversation | None:
        result = await self._session.execute(
            select(ConversationModel).where(
                ConversationModel.id == conversation_id,
                ConversationModel.deleted_at.is_(None),
            )
        )
        model = result.scalar_one_or_none()
        if not model:
            return None
        messages = await self._load_messages(conversation_id)
        return self._to_entity(model, messages)

    async def list_by_space(self, space_id: str, user_id: str) -> list[Conversation]:
        result = await self._session.execute(
            select(ConversationModel)
            .where(
                ConversationModel.space_id == space_id,
                ConversationModel.user_id == user_id,
                ConversationModel.deleted_at.is_(None),
            )
            .order_by(ConversationModel.updated_at.desc())
        )
        conversations = []
        for m in result.scalars().all():
            messages = await self._load_messages(m.id)
            conversations.append(self._to_entity(m, messages))
        return conversations

    async def save(self, conversation: Conversation) -> Conversation:
        existing = await self._session.get(ConversationModel, conversation.id)
        if existing:
            existing.title = conversation.title
        else:
            self._session.add(self._to_model(conversation))
        await self._session.flush()
        return conversation

    async def add_message(self, message: ChatMessage) -> ChatMessage:
        model = ChatMessageModel(
            id=message.id,
            conversation_id=message.conversation_id,
            role=message.role.value,
            content=message.content,
            tokens_used=message.tokens_used,
            created_at=message.created_at,
        )
        self._session.add(model)
        await self._session.flush()
        return message

    async def delete(self, conversation_id: str) -> None:
        await self._session.execute(
            update(ConversationModel)
            .where(ConversationModel.id == conversation_id)
            .values(deleted_at=datetime.now(UTC))
        )

    async def _load_messages(self, conversation_id: str) -> list[ChatMessage]:
        result = await self._session.execute(
            select(ChatMessageModel)
            .where(ChatMessageModel.conversation_id == conversation_id)
            .order_by(ChatMessageModel.created_at)
        )
        return [self._msg_to_entity(m) for m in result.scalars().all()]

    def _to_entity(self, model: ConversationModel, messages: list[ChatMessage]) -> Conversation:
        return Conversation(
            id=model.id,
            space_id=model.space_id,
            user_id=model.user_id,
            title=model.title,
            messages=messages,
            created_at=model.created_at,
            updated_at=model.updated_at,
            deleted_at=model.deleted_at,
        )

    def _to_model(self, conversation: Conversation) -> ConversationModel:
        return ConversationModel(
            id=conversation.id,
            space_id=conversation.space_id,
            user_id=conversation.user_id,
            title=conversation.title,
        )

    def _msg_to_entity(self, model: ChatMessageModel) -> ChatMessage:
        return ChatMessage(
            id=model.id,
            conversation_id=model.conversation_id,
            role=MessageRole(model.role),
            content=model.content,
            tokens_used=model.tokens_used,
            created_at=model.created_at,
        )
