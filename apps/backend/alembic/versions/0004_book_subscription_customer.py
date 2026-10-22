"""Stripe customer id on book subscriptions (für das Kundenportal)

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-22 17:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision: str = "0004"
down_revision: str = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "book_subscriptions",
        sa.Column("stripe_customer_id", sa.String(255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("book_subscriptions", "stripe_customer_id")
