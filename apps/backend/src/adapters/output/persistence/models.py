from __future__ import annotations

from datetime import datetime
from typing import Any

import sqlalchemy as sa
from pgvector.sqlalchemy import Vector
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base_model import Base, SoftDeleteMixin, TimestampMixin


class UserModel(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True)
    email: Mapped[str] = mapped_column(sa.String(255), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    hashed_password: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(sa.String(500), nullable=True)
    role: Mapped[str] = mapped_column(sa.String(50), nullable=False, default="member")
    status: Mapped[str] = mapped_column(sa.String(50), nullable=False, default="active")
    space_id: Mapped[str | None] = mapped_column(
        sa.String(36), sa.ForeignKey("spaces.id"), nullable=True
    )
    google_id: Mapped[str | None] = mapped_column(sa.String(255), unique=True, nullable=True)


class SpaceModel(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "spaces"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True)
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    slug: Mapped[str] = mapped_column(sa.String(100), unique=True, nullable=False, index=True)
    owner_id: Mapped[str] = mapped_column(sa.String(36), nullable=False)
    plan: Mapped[str] = mapped_column(sa.String(50), nullable=False, default="free")
    member_count: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=0)


class DocumentModel(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True)
    space_id: Mapped[str] = mapped_column(
        sa.String(36), sa.ForeignKey("spaces.id"), nullable=False, index=True
    )
    filename: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    status: Mapped[str] = mapped_column(sa.String(50), nullable=False, default="pending")
    chunk_count: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=0)
    error_message: Mapped[str | None] = mapped_column(sa.Text, nullable=True)

    chunks: Mapped[list[DocumentChunkModel]] = relationship(
        "DocumentChunkModel", back_populates="document", cascade="all, delete-orphan"
    )


class DocumentChunkModel(Base):
    """Stores text chunks + pgvector embeddings for RAG retrieval."""

    __tablename__ = "document_chunks"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True)
    document_id: Mapped[str] = mapped_column(
        sa.String(36), sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    chunk_index: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    content: Mapped[str] = mapped_column(sa.Text, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(1536), nullable=False)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), nullable=False)

    document: Mapped[DocumentModel] = relationship("DocumentModel", back_populates="chunks")


class ConversationModel(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True)
    space_id: Mapped[str] = mapped_column(
        sa.String(36), sa.ForeignKey("spaces.id"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(sa.String(255), nullable=False, default="New Conversation")

    messages: Mapped[list[ChatMessageModel]] = relationship(
        "ChatMessageModel", back_populates="conversation", order_by="ChatMessageModel.created_at"
    )


class ChatMessageModel(Base):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True)
    conversation_id: Mapped[str] = mapped_column(
        sa.String(36),
        sa.ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(sa.String(20), nullable=False)
    content: Mapped[str] = mapped_column(sa.Text, nullable=False)
    tokens_used: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), nullable=False)

    conversation: Mapped[ConversationModel] = relationship(
        "ConversationModel", back_populates="messages"
    )


class AgentRunModel(Base, TimestampMixin):
    __tablename__ = "agent_runs"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True)
    space_id: Mapped[str] = mapped_column(
        sa.String(36), sa.ForeignKey("spaces.id"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("users.id"), nullable=False)
    task: Mapped[str] = mapped_column(sa.Text, nullable=False)
    available_tools: Mapped[list[str]] = mapped_column(sa.JSON, nullable=False, default=list)
    status: Mapped[str] = mapped_column(sa.String(50), nullable=False, default="idle")
    result: Mapped[str | None] = mapped_column(sa.Text, nullable=True)

    steps: Mapped[list[AgentStepModel]] = relationship(
        "AgentStepModel", back_populates="agent_run", order_by="AgentStepModel.created_at"
    )


class AgentStepModel(Base):
    __tablename__ = "agent_steps"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True)
    agent_run_id: Mapped[str] = mapped_column(
        sa.String(36),
        sa.ForeignKey("agent_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    step_type: Mapped[str] = mapped_column(sa.String(50), nullable=False)
    content: Mapped[str] = mapped_column(sa.Text, nullable=False)
    tool_name: Mapped[str | None] = mapped_column(sa.String(100), nullable=True)
    tool_args: Mapped[dict[str, Any] | None] = mapped_column(sa.JSON, nullable=True)
    tool_result: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), nullable=False)

    agent_run: Mapped[AgentRunModel] = relationship("AgentRunModel", back_populates="steps")


class SubscriptionModel(Base, TimestampMixin):
    __tablename__ = "subscriptions"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True)
    space_id: Mapped[str] = mapped_column(
        sa.String(36), sa.ForeignKey("spaces.id"), nullable=False, index=True
    )
    stripe_subscription_id: Mapped[str] = mapped_column(sa.String(255), unique=True, nullable=False)
    stripe_customer_id: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    status: Mapped[str] = mapped_column(sa.String(50), nullable=False)
    plan_type: Mapped[str] = mapped_column(sa.String(50), nullable=False)
    current_period_start: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), nullable=False
    )
    current_period_end: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), nullable=False)
    cancel_at_period_end: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, default=False)
    trial_end: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)


class NotificationModel(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        sa.String(36), sa.ForeignKey("users.id"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(sa.String(50), nullable=False)
    title: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    message: Mapped[str] = mapped_column(sa.Text, nullable=False)
    read: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, default=False)
    action_url: Mapped[str | None] = mapped_column(sa.String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), nullable=False)


class ApiKeyModel(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "api_keys"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("users.id"), nullable=False)
    space_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("spaces.id"), nullable=False)
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    key_hash: Mapped[str] = mapped_column(sa.String(64), unique=True, nullable=False, index=True)
    prefix: Mapped[str] = mapped_column(sa.String(10), nullable=False)
    scopes: Mapped[list[str]] = mapped_column(sa.JSON, nullable=False, default=list)
    last_used_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)


class OutgoingWebhookModel(Base, TimestampMixin):
    __tablename__ = "outgoing_webhooks"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True)
    space_id: Mapped[str] = mapped_column(
        sa.String(36), sa.ForeignKey("spaces.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    url: Mapped[str] = mapped_column(sa.String(500), nullable=False)
    events: Mapped[list[str]] = mapped_column(sa.JSON, nullable=False, default=list)
    secret: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, default=True)
    failure_count: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=0)
    circuit_open_until: Mapped[datetime | None] = mapped_column(
        sa.DateTime(timezone=True), nullable=True
    )


class ActivityLogModel(Base):
    __tablename__ = "activity_logs"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True)
    space_id: Mapped[str] = mapped_column(
        sa.String(36), sa.ForeignKey("spaces.id"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("users.id"), nullable=False)
    action: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    resource_type: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    resource_id: Mapped[str] = mapped_column(sa.String(36), nullable=False)
    extra_metadata: Mapped[dict[str, Any] | None] = mapped_column(
        "metadata", sa.JSON, nullable=True
    )
    ip_address: Mapped[str | None] = mapped_column(sa.String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(sa.String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), nullable=False)


class AIUsageModel(Base):
    __tablename__ = "ai_usage"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True)
    space_id: Mapped[str] = mapped_column(
        sa.String(36), sa.ForeignKey("spaces.id"), nullable=False, index=True
    )
    user_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("users.id"), nullable=False)
    model: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    prompt_tokens: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    completion_tokens: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    total_tokens: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    cost_usd: Mapped[float] = mapped_column(sa.Float, nullable=False)
    feature: Mapped[str] = mapped_column(sa.String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), nullable=False)


# --- Kibuka Book Models ---


class BookModel(Base, SoftDeleteMixin):
    __tablename__ = "books"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True)
    theme: Mapped[str] = mapped_column(sa.String(50), nullable=False)
    age_range: Mapped[str] = mapped_column(sa.String(10), nullable=False)
    cover_image_url: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    is_daily_book: Mapped[bool] = mapped_column(
        sa.Boolean, nullable=False, default=False, index=True
    )
    published_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), nullable=False, index=True
    )
    page_count: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    price_single: Mapped[float] = mapped_column(sa.Numeric(5, 2), nullable=False, default=1.99)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
    )

    translations: Mapped[list[BookTranslationModel]] = relationship(
        "BookTranslationModel", back_populates="book", cascade="all, delete-orphan"
    )
    pages: Mapped[list[BookPageModel]] = relationship(
        "BookPageModel",
        back_populates="book",
        order_by="BookPageModel.page_number",
        cascade="all, delete-orphan",
    )


class BookTranslationModel(Base):
    __tablename__ = "book_translations"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True)
    book_id: Mapped[str] = mapped_column(
        sa.String(36), sa.ForeignKey("books.id", ondelete="CASCADE"), nullable=False, index=True
    )
    language: Mapped[str] = mapped_column(sa.String(5), nullable=False)
    title: Mapped[str] = mapped_column(sa.String(200), nullable=False)

    book: Mapped[BookModel] = relationship("BookModel", back_populates="translations")


class BookPageModel(Base):
    __tablename__ = "book_pages"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True)
    book_id: Mapped[str] = mapped_column(
        sa.String(36), sa.ForeignKey("books.id", ondelete="CASCADE"), nullable=False, index=True
    )
    page_number: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    illustration_url: Mapped[str | None] = mapped_column(sa.Text, nullable=True)

    book: Mapped[BookModel] = relationship("BookModel", back_populates="pages")
    contents: Mapped[list[PageContentModel]] = relationship(
        "PageContentModel", back_populates="page", cascade="all, delete-orphan"
    )


class PageContentModel(Base):
    __tablename__ = "page_content"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True)
    page_id: Mapped[str] = mapped_column(
        sa.String(36),
        sa.ForeignKey("book_pages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    language: Mapped[str] = mapped_column(sa.String(5), nullable=False)
    text: Mapped[str] = mapped_column(sa.Text, nullable=False)
    audio_url: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    word_timestamps: Mapped[list[Any] | None] = mapped_column(sa.JSON, nullable=True)

    page: Mapped[BookPageModel] = relationship("BookPageModel", back_populates="contents")


class BookPurchaseModel(Base):
    __tablename__ = "book_purchases"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        sa.String(36), sa.ForeignKey("users.id"), nullable=False, index=True
    )
    book_id: Mapped[str] = mapped_column(
        sa.String(36), sa.ForeignKey("books.id"), nullable=False, index=True
    )
    purchase_type: Mapped[str] = mapped_column(sa.String(20), nullable=False)
    stripe_payment_intent_id: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    amount: Mapped[float] = mapped_column(sa.Numeric(8, 2), nullable=False)
    currency: Mapped[str] = mapped_column(sa.String(3), nullable=False, default="EUR")
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
    )


class BookSubscriptionModel(Base):
    __tablename__ = "book_subscriptions"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        sa.String(36), sa.ForeignKey("users.id"), nullable=False, index=True
    )
    stripe_subscription_id: Mapped[str | None] = mapped_column(
        sa.String(255), unique=True, nullable=True
    )
    stripe_customer_id: Mapped[str | None] = mapped_column(sa.String(255), nullable=True)
    plan: Mapped[str] = mapped_column(sa.String(20), nullable=False)
    status: Mapped[str] = mapped_column(sa.String(20), nullable=False, default="trialing")
    current_period_end: Mapped[datetime | None] = mapped_column(
        sa.DateTime(timezone=True), nullable=True
    )
    cancel_at_period_end: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
    )


class ChildProfileModel(Base, SoftDeleteMixin):
    __tablename__ = "child_profiles"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        sa.String(36), sa.ForeignKey("users.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    age: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    preferred_languages: Mapped[list[str]] = mapped_column(
        sa.JSON, nullable=False, default=lambda: ["de"]
    )
    avatar_emoji: Mapped[str] = mapped_column(sa.String(10), nullable=False, default="🧒")
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
    )


class ReadingProgressModel(Base):
    __tablename__ = "reading_progress"

    id: Mapped[str] = mapped_column(sa.String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        sa.String(36), sa.ForeignKey("users.id"), nullable=False, index=True
    )
    child_profile_id: Mapped[str | None] = mapped_column(
        sa.String(36),
        sa.ForeignKey("child_profiles.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    book_id: Mapped[str] = mapped_column(sa.String(36), sa.ForeignKey("books.id"), nullable=False)
    current_page: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=0)
    completed_at: Mapped[datetime | None] = mapped_column(sa.DateTime(timezone=True), nullable=True)
    last_read_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
    )
