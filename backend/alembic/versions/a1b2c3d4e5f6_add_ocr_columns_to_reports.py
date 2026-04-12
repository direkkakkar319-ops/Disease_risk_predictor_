"""Add OCR result columns to reports table.

Revision ID: a1b2c3d4e5f6
Revises: fdb17dd24d3f
Create Date: 2026-04-01 10:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "a1b2c3d4e5f6"
down_revision = "fdb17dd24d3f"
branch_labels = None
depends_on = None


def upgrade():
    """
    Add the reports table (if it doesn't exist from the initial schema)
    and then add the four OCR result columns.
    """
    # Create the reports table if it was never migrated
    # (op.create_table is idempotent when using IF NOT EXISTS via raw SQL,
    #  but Alembic's create_table will fail if it already exists — so we
    #  try/except here to handle both fresh and existing databases.)
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if 'reports' not in existing_tables:
        op.create_table(
            'reports',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('filename', sa.String(), nullable=True),
            sa.Column('content_type', sa.String(), nullable=True),
            sa.Column('file_path', sa.String(), nullable=True),
            sa.Column('user_id', sa.Integer(), nullable=True),
            sa.Column('report_type', sa.String(), nullable=True),
            sa.Column('status', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_reports_id'), 'reports', ['id'], unique=False)
        op.create_index(op.f('ix_reports_filename'), 'reports', ['filename'], unique=False)
        op.create_index(op.f('ix_reports_user_id'), 'reports', ['user_id'], unique=False)
        op.create_index(op.f('ix_reports_report_type'), 'reports', ['report_type'], unique=False)

    # Add the four new OCR result columns (idempotent — check first)
    existing_columns = [col['name'] for col in inspector.get_columns('reports')]

    if 'raw_text' not in existing_columns:
        op.add_column('reports', sa.Column('raw_text', sa.Text(), nullable=True))

    if 'extracted_metrics' not in existing_columns:
        op.add_column('reports', sa.Column('extracted_metrics', sa.JSON(), nullable=True))

    if 'ocr_confidence' not in existing_columns:
        op.add_column('reports', sa.Column('ocr_confidence', sa.Float(), nullable=True))

    if 'processed_at' not in existing_columns:
        op.add_column('reports', sa.Column('processed_at', sa.DateTime(), nullable=True))


def downgrade():
    """Remove the OCR result columns from the reports table."""
    op.drop_column('reports', 'processed_at')
    op.drop_column('reports', 'ocr_confidence')
    op.drop_column('reports', 'extracted_metrics')
    op.drop_column('reports', 'raw_text')
