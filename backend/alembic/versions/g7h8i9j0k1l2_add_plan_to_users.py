"""Add plan column to users table.

Revision ID: g7h8i9j0k1l2
Revises: f6a7b8c9d0e1
Create Date: 2026-05-08 10:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision      = "g7h8i9j0k1l2"
down_revision = "f6a7b8c9d0e1"
branch_labels = None
depends_on    = None


def upgrade():
    op.add_column(
        "users",
        sa.Column(
            "plan",
            sa.String(),
            nullable=False,
            server_default="basic",
        ),
    )


def downgrade():
    op.drop_column("users", "plan")
