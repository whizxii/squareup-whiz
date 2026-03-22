"""Shared test fixtures for SquareUp Comms backend tests.

Uses an in-memory SQLite database and overrides FastAPI dependencies
so that all requests are authenticated as TEST_USER_ID.
"""

import asyncio
from typing import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel

# ---------------------------------------------------------------------------
# Test constants
# ---------------------------------------------------------------------------
TEST_USER_ID = "test-user-001"

# ---------------------------------------------------------------------------
# Engine & session factory — shared across the test session
# ---------------------------------------------------------------------------
_test_engine = create_async_engine(
    "sqlite+aiosqlite://",
    echo=False,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

_test_session_factory = async_sessionmaker(
    _test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def event_loop():
    """Use a single event loop for the entire test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(autouse=True)
async def _setup_tables():
    """Create all tables before each test, drop after."""
    # Import ALL models so SQLModel.metadata knows about every table/FK
    import app.models.users  # noqa: F401
    import app.models.chat  # noqa: F401
    import app.models.chat_signal  # noqa: F401
    import app.models.crm  # noqa: F401
    import app.models.crm_company  # noqa: F401
    import app.models.crm_audit  # noqa: F401
    import app.models.crm_note  # noqa: F401
    import app.models.crm_tag  # noqa: F401
    import app.models.crm_deal  # noqa: F401
    import app.models.crm_email  # noqa: F401
    import app.models.crm_calendar  # noqa: F401
    import app.models.crm_pipeline  # noqa: F401
    import app.models.crm_sequence  # noqa: F401
    import app.models.crm_recording  # noqa: F401
    import app.models.crm_workflow  # noqa: F401
    import app.models.crm_smart_list  # noqa: F401
    import app.models.agents  # noqa: F401
    import app.models.integrations  # noqa: F401
    import app.models.files  # noqa: F401
    import app.models.notifications  # noqa: F401
    import app.models.tasks  # noqa: F401
    import app.models.reminders  # noqa: F401
    import app.models.custom_tools  # noqa: F401
    import app.models.office  # noqa: F401
    import app.models.ai_insight  # noqa: F401
    import app.models.automation_log  # noqa: F401
    import app.models.digest  # noqa: F401

    async with _test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    yield

    async with _test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)


@pytest.fixture
async def session() -> AsyncGenerator[AsyncSession, None]:
    """Provide a fresh async session for direct DB operations in tests."""
    async with _test_session_factory() as sess:
        yield sess


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """httpx AsyncClient wired to the FastAPI app with dependency overrides."""
    from app.core.auth import get_current_user
    from app.core.db import get_session
    from app.main import app

    # Override: use test database session
    async def _override_get_session():
        async with _test_session_factory() as sess:
            yield sess

    # Override: always return TEST_USER_ID
    async def _override_get_current_user():
        return TEST_USER_ID

    app.dependency_overrides[get_session] = _override_get_session
    app.dependency_overrides[get_current_user] = _override_get_current_user

    # Set app.state for service-layer dependencies (v2 CRM routes)
    from app.core.events import EventBus
    from app.core.background import BackgroundTaskManager
    from app.core.cache import TTLCache

    app.state.event_bus = EventBus()
    app.state.background = BackgroundTaskManager()
    app.state.cache = TTLCache(default_ttl=300)

    # Also init shared_infra so tools/scheduler use the same instances
    from app.core.shared_infra import init as _init_shared_infra
    _init_shared_infra(
        event_bus=app.state.event_bus,
        background=app.state.background,
        cache=app.state.cache,
    )

    # Disable rate limiting in tests to avoid cross-test pollution
    from app.core.rate_limit import limiter
    limiter.enabled = False

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
