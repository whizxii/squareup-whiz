"""add pgvector embeddings

Revision ID: a1e7f3c28d40
Revises: 56c31fa25bd0
Create Date: 2026-03-22 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "a1e7f3c28d40"
down_revision: Union[str, None] = "56c31fa25bd0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Enable pgvector extension (Supabase has it pre-installed, just needs CREATE)
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # 2. Add embedding columns (768-dim = Gemini text-embedding-004 output)
    # Raw SQL because the vector type requires the extension loaded first
    op.execute("ALTER TABLE messages ADD COLUMN IF NOT EXISTS embedding vector(768)")
    op.execute("ALTER TABLE crm_notes ADD COLUMN IF NOT EXISTS embedding vector(768)")

    # 3. Create HNSW indexes for fast cosine similarity search
    # HNSW is faster than IVFFlat for <1M records and doesn't need training
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_messages_embedding_hnsw "
        "ON messages USING hnsw (embedding vector_cosine_ops) "
        "WITH (m = 16, ef_construction = 64)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_crm_notes_embedding_hnsw "
        "ON crm_notes USING hnsw (embedding vector_cosine_ops) "
        "WITH (m = 16, ef_construction = 64)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_crm_notes_embedding_hnsw")
    op.execute("DROP INDEX IF EXISTS idx_messages_embedding_hnsw")
    op.execute("ALTER TABLE crm_notes DROP COLUMN IF EXISTS embedding")
    op.execute("ALTER TABLE messages DROP COLUMN IF EXISTS embedding")
    # Don't drop the vector extension — other tables may use it
