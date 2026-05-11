"""Add Kibuka book tables

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-09 06:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision: str = "0002"
down_revision: str = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- Books ---
    op.create_table(
        "books",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("theme", sa.String(50), nullable=False),
        sa.Column("age_range", sa.String(10), nullable=False),
        sa.Column("cover_image_url", sa.Text, nullable=True),
        sa.Column("is_daily_book", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("page_count", sa.Integer, nullable=False),
        sa.Column("price_single", sa.Numeric(5, 2), nullable=False, server_default="1.99"),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_books_published_at", "books", ["published_at"])
    op.create_index("ix_books_is_daily_book", "books", ["is_daily_book"])
    op.create_index("ix_books_theme", "books", ["theme"])

    # --- Book Translations ---
    op.create_table(
        "book_translations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "book_id", sa.String(36), sa.ForeignKey("books.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("language", sa.String(5), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.UniqueConstraint("book_id", "language", name="uq_book_translations_book_lang"),
    )
    op.create_index("ix_book_translations_book_id", "book_translations", ["book_id"])

    # --- Book Pages ---
    op.create_table(
        "book_pages",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "book_id", sa.String(36), sa.ForeignKey("books.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("page_number", sa.Integer, nullable=False),
        sa.Column("illustration_url", sa.Text, nullable=True),
        sa.UniqueConstraint("book_id", "page_number", name="uq_book_pages_book_page"),
    )
    op.create_index("ix_book_pages_book_id", "book_pages", ["book_id"])

    # --- Page Content (text + audio per language per page) ---
    op.create_table(
        "page_content",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "page_id",
            sa.String(36),
            sa.ForeignKey("book_pages.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("language", sa.String(5), nullable=False),
        sa.Column("text", sa.Text, nullable=False),
        sa.Column("audio_url", sa.Text, nullable=True),
        sa.Column(
            "word_timestamps", sa.JSON, nullable=True
        ),  # [{word, start_time_ms, end_time_ms}]
        sa.UniqueConstraint("page_id", "language", name="uq_page_content_page_lang"),
    )
    op.create_index("ix_page_content_page_id", "page_content", ["page_id"])

    # --- Book Purchases ---
    op.create_table(
        "book_purchases",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("book_id", sa.String(36), sa.ForeignKey("books.id"), nullable=False),
        sa.Column(
            "purchase_type", sa.String(20), nullable=False
        ),  # single, week_bundle, monthly, yearly
        sa.Column("stripe_payment_intent_id", sa.String(255), nullable=True),
        sa.Column("amount", sa.Numeric(8, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="EUR"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_book_purchases_user_id", "book_purchases", ["user_id"])
    op.create_index("ix_book_purchases_book_id", "book_purchases", ["book_id"])

    # --- Book Subscriptions ---
    op.create_table(
        "book_subscriptions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("stripe_subscription_id", sa.String(255), unique=True, nullable=True),
        sa.Column("plan", sa.String(20), nullable=False),  # monthly, yearly
        sa.Column("status", sa.String(20), nullable=False, server_default="trialing"),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancel_at_period_end", sa.Boolean, nullable=False, server_default="false"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_book_subscriptions_user_id", "book_subscriptions", ["user_id"])

    # --- Child Profiles ---
    op.create_table(
        "child_profiles",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("age", sa.Integer, nullable=False),
        sa.Column("preferred_languages", sa.JSON, nullable=False, server_default='["de"]'),
        sa.Column("avatar_emoji", sa.String(10), nullable=False, server_default="🧒"),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_child_profiles_user_id", "child_profiles", ["user_id"])

    # --- Reading Progress ---
    op.create_table(
        "reading_progress",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column(
            "child_profile_id",
            sa.String(36),
            sa.ForeignKey("child_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("book_id", sa.String(36), sa.ForeignKey("books.id"), nullable=False),
        sa.Column("current_page", sa.Integer, nullable=False, server_default="0"),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "last_read_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("child_profile_id", "book_id", name="uq_reading_progress_profile_book"),
    )
    op.create_index(
        "ix_reading_progress_child_profile_id", "reading_progress", ["child_profile_id"]
    )


def downgrade() -> None:
    op.drop_table("reading_progress")
    op.drop_table("child_profiles")
    op.drop_table("book_subscriptions")
    op.drop_table("book_purchases")
    op.drop_table("page_content")
    op.drop_table("book_pages")
    op.drop_table("book_translations")
    op.drop_table("books")
