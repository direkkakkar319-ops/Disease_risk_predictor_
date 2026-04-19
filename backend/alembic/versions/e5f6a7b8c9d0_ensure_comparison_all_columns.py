"""Ensure all required columns exist in report_comparisons.

The earlier fix migration (d4e5f6a7b8c9) added six columns but missed
user_id and report_type.  This migration adds them if they are absent so
that the INSERT in POST /api/compare never fails with a missing-column error.

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-04-14 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if "report_comparisons" not in inspector.get_table_names():
        # Table doesn't exist at all — nothing to patch; the earlier migration
        # (c3d4e5f6a7b8) should have already created it in full.
        return

    existing = {col["name"] for col in inspector.get_columns("report_comparisons")}

    if "user_id" not in existing:
        op.add_column(
            "report_comparisons",
            sa.Column("user_id", sa.Integer(), nullable=True),
        )

    if "report_type" not in existing:
        op.add_column(
            "report_comparisons",
            sa.Column("report_type", sa.String(), nullable=True),
        )


def downgrade():
    op.drop_column("report_comparisons", "report_type")
    op.drop_column("report_comparisons", "user_id")
