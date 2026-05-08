"""Initial schema with pgvector

Revision ID: 0001
Revises:
Create Date: 2026-01-01 00:00:00.000000
"""
from __future__ import annotations
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

revision: str = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table("spaces",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("owner_id", sa.String(36), nullable=False),
        sa.Column("plan", sa.String(50), nullable=False, server_default="free"),
        sa.Column("member_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_spaces_slug", "spaces", ["slug"], unique=True)

    op.create_table("users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=True),
        sa.Column("avatar_url", sa.String(500), nullable=True),
        sa.Column("role", sa.String(50), nullable=False, server_default="member"),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
        sa.Column("space_id", sa.String(36), sa.ForeignKey("spaces.id"), nullable=True),
        sa.Column("google_id", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_google_id", "users", ["google_id"], unique=True)

    op.create_table("documents",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("space_id", sa.String(36), sa.ForeignKey("spaces.id"), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("content_type", sa.String(100), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("chunk_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_documents_space_id", "documents", ["space_id"])

    op.create_table("document_chunks",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("document_id", sa.String(36), sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("chunk_index", sa.Integer, nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("embedding", Vector(1536), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_document_chunks_document_id", "document_chunks", ["document_id"])
    # HNSW index for fast approximate nearest-neighbor search
    op.execute("""
        CREATE INDEX document_chunks_embedding_hnsw_idx
        ON document_chunks
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """)

    op.create_table("conversations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("space_id", sa.String(36), sa.ForeignKey("spaces.id"), nullable=False),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False, server_default="New Conversation"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table("chat_messages",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("conversation_id", sa.String(36), sa.ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("tokens_used", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table("agent_runs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("space_id", sa.String(36), sa.ForeignKey("spaces.id"), nullable=False),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("task", sa.Text, nullable=False),
        sa.Column("available_tools", sa.JSON, nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="idle"),
        sa.Column("result", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table("agent_steps",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("agent_run_id", sa.String(36), sa.ForeignKey("agent_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("step_type", sa.String(50), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("tool_name", sa.String(100), nullable=True),
        sa.Column("tool_args", sa.JSON, nullable=True),
        sa.Column("tool_result", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table("subscriptions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("space_id", sa.String(36), sa.ForeignKey("spaces.id"), nullable=False),
        sa.Column("stripe_subscription_id", sa.String(255), unique=True, nullable=False),
        sa.Column("stripe_customer_id", sa.String(255), nullable=False),
        sa.Column("status", sa.String(50), nullable=False),
        sa.Column("plan_type", sa.String(50), nullable=False),
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("cancel_at_period_end", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("trial_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table("notifications",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("read", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("action_url", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table("api_keys",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("space_id", sa.String(36), sa.ForeignKey("spaces.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("key_hash", sa.String(64), unique=True, nullable=False),
        sa.Column("prefix", sa.String(10), nullable=False),
        sa.Column("scopes", sa.JSON, nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_api_keys_key_hash", "api_keys", ["key_hash"], unique=True)

    op.create_table("outgoing_webhooks",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("space_id", sa.String(36), sa.ForeignKey("spaces.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column("events", sa.JSON, nullable=False),
        sa.Column("secret", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("failure_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("circuit_open_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table("activity_logs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("space_id", sa.String(36), sa.ForeignKey("spaces.id"), nullable=False),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("resource_type", sa.String(100), nullable=False),
        sa.Column("resource_id", sa.String(36), nullable=False),
        sa.Column("metadata", sa.JSON, nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table("ai_usage",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("space_id", sa.String(36), sa.ForeignKey("spaces.id"), nullable=False),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("model", sa.String(100), nullable=False),
        sa.Column("prompt_tokens", sa.Integer, nullable=False),
        sa.Column("completion_tokens", sa.Integer, nullable=False),
        sa.Column("total_tokens", sa.Integer, nullable=False),
        sa.Column("cost_usd", sa.Float, nullable=False),
        sa.Column("feature", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_ai_usage_space_id", "ai_usage", ["space_id"])


def downgrade() -> None:
    op.drop_table("ai_usage")
    op.drop_table("activity_logs")
    op.drop_table("outgoing_webhooks")
    op.drop_table("api_keys")
    op.drop_table("notifications")
    op.drop_table("subscriptions")
    op.drop_table("agent_steps")
    op.drop_table("agent_runs")
    op.drop_table("chat_messages")
    op.drop_table("conversations")
    op.drop_table("document_chunks")
    op.drop_table("documents")
    op.drop_table("users")
    op.drop_table("spaces")
    op.execute("DROP EXTENSION IF EXISTS vector")
