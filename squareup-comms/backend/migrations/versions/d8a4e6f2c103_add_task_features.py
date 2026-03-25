"""add task subtasks, comments, activity, and soft delete

Revision ID: d8a4e6f2c103
Revises: c7f29e4a1b83
Create Date: 2026-03-25 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "d8a4e6f2c103"
down_revision: Union[str, None] = "c7f29e4a1b83"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Tasks: new columns ---
    op.add_column("tasks", sa.Column("parent_id", sa.String(), sa.ForeignKey("tasks.id"), nullable=True))
    op.add_column("tasks", sa.Column("workspace_id", sa.String(128), nullable=True))
    op.add_column("tasks", sa.Column("position", sa.Integer(), server_default="0", nullable=False))
    op.add_column("tasks", sa.Column("estimated_minutes", sa.Integer(), nullable=True))
    op.add_column("tasks", sa.Column("completed_at", sa.DateTime(), nullable=True))
    op.add_column("tasks", sa.Column("is_deleted", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("tasks", sa.Column("deleted_at", sa.DateTime(), nullable=True))

    op.create_index("ix_tasks_parent_id", "tasks", ["parent_id"])
    op.create_index("ix_tasks_workspace_status", "tasks", ["workspace_id", "status", "is_deleted"])

    # --- Notifications: task_id FK ---
    op.add_column("notifications", sa.Column("task_id", sa.String(), sa.ForeignKey("tasks.id"), nullable=True))

    # --- task_comments table ---
    op.create_table(
        "task_comments",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("task_id", sa.String(), sa.ForeignKey("tasks.id"), nullable=False, index=True),
        sa.Column("user_id", sa.String(128), nullable=False, index=True),
        sa.Column("content", sa.String(5000), nullable=False),
        sa.Column("mentions", sa.Text(), server_default="[]"),
        sa.Column("is_deleted", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )

    # --- task_activity table ---
    op.create_table(
        "task_activity",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("task_id", sa.String(), sa.ForeignKey("tasks.id"), nullable=False, index=True),
        sa.Column("user_id", sa.String(128), nullable=False),
        sa.Column("action", sa.String(30), nullable=False),
        sa.Column("field_changed", sa.String(50), nullable=True),
        sa.Column("old_value", sa.Text(), nullable=True),
        sa.Column("new_value", sa.Text(), nullable=True),
        sa.Column("extra_data", sa.Text(), server_default="{}"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("task_activity")
    op.drop_table("task_comments")

    op.drop_column("notifications", "task_id")

    op.drop_index("ix_tasks_workspace_status", table_name="tasks")
    op.drop_index("ix_tasks_parent_id", table_name="tasks")
    op.drop_column("tasks", "deleted_at")
    op.drop_column("tasks", "is_deleted")
    op.drop_column("tasks", "completed_at")
    op.drop_column("tasks", "estimated_minutes")
    op.drop_column("tasks", "position")
    op.drop_column("tasks", "workspace_id")
    op.drop_column("tasks", "parent_id")
