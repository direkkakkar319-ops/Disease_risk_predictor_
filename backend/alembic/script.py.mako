"""Alembic migration template.

${message}

Revision ID: ${up_revision}
Revises: ${down_revision}
Create Date: ${create_date}
"""

from alembic import op
import sqlalchemy as sa

revision = "${up_revision}"
down_revision = ${repr(down_revision)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}


def upgrade():
    """Apply the migration steps."""
    ${upgrades if upgrades else "pass"}


def downgrade():
    """Revert the migration steps."""
    ${downgrades if downgrades else "pass"}
