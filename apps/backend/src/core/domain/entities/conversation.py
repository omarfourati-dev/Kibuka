from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


@dataclass
class ChatMessage:
    id: str
    conversation_id: str
    role: MessageRole
    content: str
    tokens_used: int = 0
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class Conversation:
    id: str
    space_id: str
    user_id: str
    title: str = "New Conversation"
    messages: list[ChatMessage] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = None
