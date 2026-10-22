"""Reading progress per user (child profile optional)

Die Progress-API arbeitet pro Nutzer; Kinderprofile sind optional.
Die Tabelle war bis hier ungenutzt (Fortschritt lag in-memory), daher
sind die Constraints gefahrlos umbaubar.

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-22 16:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision: str = "0003"
down_revision: str = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "reading_progress",
        sa.Column("user_id", sa.String(36), nullable=False),
    )
    op.create_foreign_key(
        "fk_reading_progress_user_id",
        "reading_progress",
        "users",
        ["user_id"],
        ["id"],
    )
    op.create_index("ix_reading_progress_user_id", "reading_progress", ["user_id"])
    op.alter_column(
        "reading_progress",
        "child_profile_id",
        existing_type=sa.String(36),
        nullable=True,
    )
    op.drop_constraint("uq_reading_progress_profile_book", "reading_progress", type_="unique")
    op.create_unique_constraint(
        "uq_reading_progress_user_book", "reading_progress", ["user_id", "book_id"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_reading_progress_user_book", "reading_progress", type_="unique")
    op.create_unique_constraint(
        "uq_reading_progress_profile_book",
        "reading_progress",
        ["child_profile_id", "book_id"],
    )
    op.alter_column(
        "reading_progress",
        "child_profile_id",
        existing_type=sa.String(36),
        nullable=False,
    )
    op.drop_index("ix_reading_progress_user_id", table_name="reading_progress")
    op.drop_constraint("fk_reading_progress_user_id", "reading_progress", type_="foreignkey")
    op.drop_column("reading_progress", "user_id")
