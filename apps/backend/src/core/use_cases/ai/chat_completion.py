from __future__ import annotations

import uuid
from collections.abc import AsyncGenerator
from dataclasses import dataclass

from ...domain.entities.conversation import ChatMessage, Conversation, MessageRole
from ...domain.exceptions.ai import AIFeatureDisabledError, ConversationNotFoundError
from ...ports.output.i_ai_client import IAIClient
from ...ports.output.i_conversation_repository import IConversationRepository


@dataclass
class ChatCommand:
    space_id: str
    user_id: str
    message: str
    conversation_id: str | None = None
    model: str = "gpt-4.1-mini"


class ChatCompletionUseCase:
    def __init__(
        self,
        conversation_repo: IConversationRepository,
        ai_client: IAIClient,
        enable_ai: bool = True,
    ) -> None:
        self._conversation_repo = conversation_repo
        self._ai_client = ai_client
        self._enable_ai = enable_ai

    async def execute(self, command: ChatCommand) -> AsyncGenerator[str, None]:
        if not self._enable_ai:
            raise AIFeatureDisabledError("AI features are disabled")

        if command.conversation_id:
            conversation = await self._conversation_repo.get_by_id(command.conversation_id)
            if not conversation:
                raise ConversationNotFoundError(f"Conversation {command.conversation_id} not found")
        else:
            conversation = Conversation(
                id=str(uuid.uuid4()),
                space_id=command.space_id,
                user_id=command.user_id,
                title=command.message[:50],
            )
            await self._conversation_repo.save(conversation)

        user_message = ChatMessage(
            id=str(uuid.uuid4()),
            conversation_id=conversation.id,
            role=MessageRole.USER,
            content=command.message,
        )
        await self._conversation_repo.add_message(user_message)

        messages = [
            {"role": msg.role.value, "content": msg.content} for msg in conversation.messages
        ] + [{"role": "user", "content": command.message}]

        return await self._ai_client.chat_completion(messages, command.model, stream=True)
