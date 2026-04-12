"""Add report_comparisons table.

Revision ID: c3d4e5f6a7b8
Revises: a1b2c3d4e5f6
Create Date: 2026-04-12 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "c3d4e5f6a7b8"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'report_comparisons' not in inspector.get_table_names():
        op.create_table(
            'report_comparisons',
            sa.Column('id', sa.String(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=True),
            sa.Column('report1_id', sa.Integer(), nullable=True),
            sa.Column('report2_id', sa.Integer(), nullable=True),
            sa.Column('report_type', sa.String(), nullable=True),
            sa.Column('status', sa.String(), nullable=True),
            sa.Column('comparison_data', sa.JSON(), nullable=True),
            sa.Column('significant_changes', sa.JSON(), nullable=True),
            sa.Column('trend_analysis', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_report_comparisons_id', 'report_comparisons', ['id'], unique=False)
        op.create_index('ix_report_comparisons_user_id', 'report_comparisons', ['user_id'], unique=False)


def downgrade():
    op.drop_index('ix_report_comparisons_user_id', table_name='report_comparisons')
    op.drop_index('ix_report_comparisons_id', table_name='report_comparisons')
    op.drop_table('report_comparisons')
