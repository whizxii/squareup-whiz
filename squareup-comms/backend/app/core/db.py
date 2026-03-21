from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlmodel import SQLModel
from app.core.config import settings

db_url = settings.DATABASE_URL
engine_kwargs = {}

if "postgresql" in db_url:
    engine_kwargs = {
        "pool_size": 5,
        "max_overflow": 10,
        "pool_pre_ping": True,
    }
    if "asyncpg" in db_url:
        engine_kwargs["connect_args"] = {
            "prepared_statement_cache_size": 0,
            "statement_cache_size": 0,
        }

engine = create_async_engine(
    db_url,
    echo=settings.DEBUG,
    **engine_kwargs,
)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_session():
    async with async_session() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    # Add new columns to existing tables (create_all only creates new tables,
    # it does not alter existing ones).
    await _migrate_new_columns()


async def _migrate_new_columns() -> None:
    """Safely add columns that were added after the initial schema.

    Uses ADD COLUMN IF NOT EXISTS (PostgreSQL 9.6+) or catches errors
    for SQLite (dev).
    """
    from sqlalchemy import text as sa_text

    _AGENT_COLUMNS = [
        ("max_iterations", "INTEGER DEFAULT 5"),
        ("autonomy_level", "INTEGER DEFAULT 2"),
        ("temperature", "FLOAT DEFAULT 0.7"),
        ("custom_tools", "TEXT DEFAULT '[]'"),
        ("monthly_budget_usd", "FLOAT"),
        ("daily_execution_limit", "INTEGER"),
        ("cost_this_month", "FLOAT DEFAULT 0.0"),
        ("cost_month_key", "VARCHAR(7)"),
        ("last_scheduled_run", "TIMESTAMP"),
    ]

    async with engine.begin() as conn:
        if "postgresql" in db_url:
            await conn.execute(sa_text("SET LOCAL statement_timeout = 0"))
            for col_name, col_type in _AGENT_COLUMNS:
                await conn.execute(sa_text(
                    f"ALTER TABLE agents ADD COLUMN IF NOT EXISTS {col_name} {col_type}"
                ))
        else:
            # SQLite: no IF NOT EXISTS — catch the "duplicate column" error
            for col_name, col_type in _AGENT_COLUMNS:
                try:
                    await conn.execute(sa_text(
                        f"ALTER TABLE agents ADD COLUMN {col_name} {col_type}"
                    ))
                except Exception:
                    pass  # Column already exists
