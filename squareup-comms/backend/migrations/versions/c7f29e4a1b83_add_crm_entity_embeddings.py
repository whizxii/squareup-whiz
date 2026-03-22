"""add embedding columns to crm_contacts and crm_companies

Revision ID: c7f29e4a1b83
Revises: a1e7f3c28d40
Create Date: 2026-03-22 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "c7f29e4a1b83"
down_revision: Union[str, None] = "a1e7f3c28d40"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # pgvector extension already enabled by previous migration

    # Add embedding columns (768-dim = Gemini text-embedding-004)
    op.execute("ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS embedding vector(768)")
    op.execute("ALTER TABLE crm_companies ADD COLUMN IF NOT EXISTS embedding vector(768)")

    # HNSW indexes for fast cosine similarity search
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_crm_contacts_embedding_hnsw "
        "ON crm_contacts USING hnsw (embedding vector_cosine_ops) "
        "WITH (m = 16, ef_construction = 64)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_crm_companies_embedding_hnsw "
        "ON crm_companies USING hnsw (embedding vector_cosine_ops) "
        "WITH (m = 16, ef_construction = 64)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_crm_companies_embedding_hnsw")
    op.execute("DROP INDEX IF EXISTS idx_crm_contacts_embedding_hnsw")
    op.execute("ALTER TABLE crm_companies DROP COLUMN IF EXISTS embedding")
    op.execute("ALTER TABLE crm_contacts DROP COLUMN IF EXISTS embedding")
