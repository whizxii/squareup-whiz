from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlmodel import SQLModel
from app.core.config import settings

# Use SQLite for dev if no PostgreSQL is configured
db_url = settings.DATABASE_URL
if "postgresql" in db_url:
    try:
        import asyncpg  # noqa: F401
        engine_kwargs = {
            "pool_size": 5,
            "max_overflow": 10,
            "pool_pre_ping": True,
        }
    except Exception:
        # Fallback to SQLite if asyncpg connection fails
        db_url = "sqlite+aiosqlite:///./dev.db"
        engine_kwargs = {}
else:
    engine_kwargs = {}

# If env var overrides to sqlite
if "sqlite" in db_url:
    engine_kwargs = {}

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
