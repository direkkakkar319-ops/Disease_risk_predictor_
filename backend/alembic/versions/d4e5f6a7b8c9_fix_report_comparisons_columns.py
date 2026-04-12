"""Add missing columns to report_comparisons table.

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-04-12 14:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "d4e5f6a7b8c9"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # Table may have been created by create_all with fewer columns — add any that are missing
    if 'report_comparisons' not in inspector.get_table_names():
        # Table doesn't exist at all — create it in full
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
            sa.Column('created_at', sa.DateTime(timezone=True),
                      server_default=sa.text('now()'), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )
        return

    existing = {col['name'] for col in inspector.get_columns('report_comparisons')}

    if 'report1_id' not in existing:
        op.add_column('report_comparisons',
                      sa.Column('report1_id', sa.Integer(), nullable=True))

    if 'report2_id' not in existing:
        op.add_column('report_comparisons',
                      sa.Column('report2_id', sa.Integer(), nullable=True))

    if 'comparison_data' not in existing:
        op.add_column('report_comparisons',
                      sa.Column('comparison_data', sa.JSON(), nullable=True))

    if 'significant_changes' not in existing:
        op.add_column('report_comparisons',
                      sa.Column('significant_changes', sa.JSON(), nullable=True))

    if 'trend_analysis' not in existing:
        op.add_column('report_comparisons',
                      sa.Column('trend_analysis', sa.String(), nullable=True))

    if 'status' not in existing:
        op.add_column('report_comparisons',
                      sa.Column('status', sa.String(), nullable=True))


def downgrade():
    op.drop_column('report_comparisons', 'significant_changes')
    op.drop_column('report_comparisons', 'comparison_data')
    op.drop_column('report_comparisons', 'report2_id')
    op.drop_column('report_comparisons', 'report1_id')
