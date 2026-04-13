"""Fix report_comparisons.id column from INTEGER to VARCHAR for UUID storage.

The table was originally created with an auto-increment integer primary key.
Later code switched to UUID strings but the database column type was never
updated, causing:
    psycopg2.errors.InvalidTextRepresentation:
    invalid input syntax for type integer: "<uuid>"

This migration detects the mismatch and converts the column in-place.
Existing rows (if any) have their integer id cast to text — they are harmless
orphans since they were never completed successfully.

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-04-14 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "f6a7b8c9d0e1"
down_revision = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if "report_comparisons" not in inspector.get_table_names():
        return

    columns = {col["name"]: col for col in inspector.get_columns("report_comparisons")}
    id_col = columns.get("id")
    if id_col is None:
        return

    # Only act when the column is actually an integer type
    col_type = str(id_col["type"]).upper()
    if "INT" not in col_type:
        return  # Already VARCHAR/TEXT — nothing to do

    # 1. Drop the primary-key constraint (its name varies by how it was created)
    conn.execute(sa.text(
        "ALTER TABLE report_comparisons DROP CONSTRAINT IF EXISTS report_comparisons_pkey"
    ))
    # 2. Drop the named index if it was created separately
    conn.execute(sa.text(
        "DROP INDEX IF EXISTS ix_report_comparisons_id"
    ))
    # 3. Convert the column — existing integer rows are cast to their text repr
    conn.execute(sa.text(
        "ALTER TABLE report_comparisons ALTER COLUMN id TYPE VARCHAR USING id::text"
    ))
    # 4. Re-add the primary-key constraint
    conn.execute(sa.text(
        "ALTER TABLE report_comparisons ADD PRIMARY KEY (id)"
    ))
    # 5. Re-create the named index
    conn.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS ix_report_comparisons_id ON report_comparisons (id)"
    ))


def downgrade():
    # Intentionally left blank — converting back to INTEGER would destroy UUID data
    pass
