"""Kündigungen über den Kündigungsbutton (§ 312k BGB)

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-22 19:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision: str = "0005"
down_revision: str = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "contract_cancellations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("reason", sa.Text, nullable=True),
        sa.Column("contract_reference", sa.String(120), nullable=True),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("outcome", sa.String(30), nullable=False),
        sa.Column("user_id", sa.String(36), nullable=True),
        sa.Column("stripe_subscription_id", sa.String(255), nullable=True),
        sa.Column("effective_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_contract_cancellations_email", "contract_cancellations", ["email"])
    op.create_index("ix_contract_cancellations_user_id", "contract_cancellations", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_contract_cancellations_user_id", "contract_cancellations")
    op.drop_index("ix_contract_cancellations_email", "contract_cancellations")
    op.drop_table("contract_cancellations")
