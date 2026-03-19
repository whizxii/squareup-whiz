from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import json
from sqlalchemy import text

from app.core.config import settings
from app.core.logging_config import setup_logging, get_logger
from app.core.db import init_db, async_session
from app.services.crm_activity_capture import ActivityCaptureService
from app.services.crm_followup_service import FollowUpService
from app.services.integrations.gmail_sync import GmailSyncService
from app.core.auth import verify_ws_token
from app.core.middleware import RequestIdMiddleware, LoggingMiddleware
from app.core.security_headers import SecurityHeadersMiddleware
from app.core.events import EventBus
from app.core.background import BackgroundTaskManager
from app.core.cache import TTLCache
from app.core.responses import (
    ApiError,
    api_error_handler,
    http_exception_handler,
    validation_exception_handler,
    unhandled_exception_handler,
)
from app.core.rate_limit import limiter, rate_limit_handler
from slowapi.errors import RateLimitExceeded
from app.websocket.manager import hub_manager
from app.websocket.handlers import handle_ws_message, set_event_bus
from app.services.ai.chat_intelligence import ChatIntelligenceService
from app.services.chat_activity_bridge import ChatActivityBridge
from app.api.channels import router as channels_router
from app.api.messages import router as messages_router
from app.api.crm import router as crm_router
from app.api.agents import router as agents_router
from app.api.auth import router as auth_router
from app.api.calendar import router as calendar_router
from app.api.crm_contacts import router as crm_contacts_router
from app.api.crm_companies import router as crm_companies_router
from app.api.crm_tags import router as crm_tags_router
from app.api.crm_notes import router as crm_notes_router
from app.api.crm_pipelines import router as crm_pipelines_router
from app.api.crm_deals import router as crm_deals_router
from app.api.crm_emails import router as crm_emails_router
from app.api.crm_sequences import router as crm_sequences_router
from app.api.crm_calendar import router as crm_calendar_router
from app.api.drive import router as drive_router
from app.api.crm_recordings import router as crm_recordings_router
from app.api.calls import router as calls_router
from app.api.crm_ai import router as crm_ai_router
from app.api.crm_workflows import router as crm_workflows_router
from app.api.crm_smart_lists import router as crm_smart_lists_router
from app.api.crm_analytics import router as crm_analytics_router
from app.api.crm_bulk import router as crm_bulk_router
from app.api.crm_dedup import router as crm_dedup_router
from app.api.users import router as users_router
from app.api.seed import router as seed_router  # noqa: F401 — seed upsert endpoint
from app.api.tasks import router as tasks_router
from app.api.reminders import router as reminders_router
from app.api.custom_tools import router as custom_tools_router
from app.api.mcp import router as mcp_router
from app.api.integrations import router as integrations_router
from app.api.chat_intelligence import router as chat_intelligence_router
from app.api.office import router as office_router
from app.api.ai_insights import router as ai_insights_router
from app.api.automation import router as automation_router
from app.api.digests import router as digests_router

# Initialize structured logging before anything else
setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI):
    logger.info("Starting SquareUp Comms backend...")

    # Production safety: warn loudly if dev auth is enabled in non-debug mode
    if settings.ENABLE_DEV_AUTH and not settings.DEBUG:
        logger.critical(
            "ENABLE_DEV_AUTH is TRUE in a non-DEBUG environment! "
            "This bypasses authentication. Set ENABLE_DEV_AUTH=false for production."
        )

    await init_db()
    logger.info("Database initialized.")

    # Register all built-in agent tools at startup
    import app.services.tools  # noqa: F401 — triggers auto-registration
    logger.info("Agent tool registry initialized.")

    # Initialize shared infrastructure on app.state
    application.state.event_bus = EventBus()
    application.state.background = BackgroundTaskManager()
    application.state.cache = TTLCache(default_ttl=300)
    logger.info("Event bus, background tasks, and cache initialized.")

    # Register activity auto-capture handlers
    activity_capture = ActivityCaptureService(
        event_bus=application.state.event_bus,
        session_factory=async_session,
    )
    activity_capture.register_handlers()
    logger.info("Activity auto-capture handlers registered.")

    # Register Chat Intelligence pipeline (chat → CRM signals)
    set_event_bus(application.state.event_bus)
    chat_intelligence = ChatIntelligenceService(
        event_bus=application.state.event_bus,
        session_factory=async_session,
    )
    chat_intelligence.register_handlers()

    chat_bridge = ChatActivityBridge(
        event_bus=application.state.event_bus,
        session_factory=async_session,
    )
    chat_bridge.register_handlers()
    logger.info("Chat Intelligence pipeline registered.")

    # Register follow-up auto-creation handlers
    followup_svc = FollowUpService(
        session=None,
        events=application.state.event_bus,
        background=application.state.background,
        cache=application.state.cache,
        session_factory=async_session,
    )
    followup_svc.register_handlers()
    logger.info("Follow-up auto-creation handlers registered.")

    # Schedule periodic Gmail sync (mock mode when API not configured)
    if settings.GMAIL_SYNC_ENABLED:
        async def _gmail_sync_job() -> None:
            async with async_session() as session:
                gmail_svc = GmailSyncService(
                    session,
                    application.state.event_bus,
                    application.state.background,
                    application.state.cache,
                )
                await gmail_svc.sync_now()

        application.state.background.schedule_periodic(
            _gmail_sync_job,
            interval_seconds=settings.GMAIL_SYNC_INTERVAL_SECONDS,
            name="gmail-sync",
        )
        logger.info("Gmail periodic sync scheduled (every %ds).", settings.GMAIL_SYNC_INTERVAL_SECONDS)

    # Start background scheduler for reminders
    import asyncio
    from app.services.scheduler import scheduler_loop
    _scheduler_task = asyncio.create_task(scheduler_loop())
    logger.info("Background scheduler started (reminders).")

    yield

    # Cancel scheduler on shutdown
    _scheduler_task.cancel()

    logger.info("Shutting down...")
    await application.state.background.shutdown()
    application.state.event_bus.clear()
    application.state.cache.clear()


app = FastAPI(
    title=settings.APP_NAME,
    lifespan=lifespan,
)

# Register global error handlers
app.add_exception_handler(ApiError, api_error_handler)
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# Rate limiter state
app.state.limiter = limiter

# Middleware (order matters — outermost first)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(LoggingMiddleware)
app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_origin_regex=settings.ALLOWED_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-User-Id", "X-Request-Id"],
)

# REST API routers
app.include_router(auth_router)
app.include_router(channels_router)
app.include_router(messages_router)
app.include_router(crm_router)
app.include_router(agents_router)
app.include_router(calendar_router)
app.include_router(crm_contacts_router)
app.include_router(crm_companies_router)
app.include_router(crm_tags_router)
app.include_router(crm_notes_router)
app.include_router(crm_pipelines_router)
app.include_router(crm_deals_router)
app.include_router(crm_emails_router)
app.include_router(crm_sequences_router)
app.include_router(crm_calendar_router)
app.include_router(crm_recordings_router)
app.include_router(drive_router)
app.include_router(calls_router)
app.include_router(crm_ai_router)
app.include_router(crm_workflows_router)
app.include_router(crm_smart_lists_router)
app.include_router(crm_analytics_router)
app.include_router(crm_bulk_router)
app.include_router(crm_dedup_router)
app.include_router(users_router)
app.include_router(seed_router)
app.include_router(tasks_router)
app.include_router(reminders_router)
app.include_router(custom_tools_router)
app.include_router(mcp_router)
app.include_router(integrations_router)
app.include_router(chat_intelligence_router)
app.include_router(office_router)
app.include_router(ai_insights_router)
app.include_router(automation_router)
app.include_router(digests_router)


@app.get("/health")
async def health():
    db_status = "connected"
    try:
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
    except Exception:
        db_status = "unreachable"

    status = "ok" if db_status == "connected" else "degraded"
    return {"status": status, "service": "squareup-comms", "database": db_status}


@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(default=None),
):
    """Multiplexed WebSocket endpoint.

    Authenticate via ?token=<firebase_token> query param.
    For dev mode, connects as dev-user-001 if no token.
    """
    try:
        user_id = await verify_ws_token(token)
    except Exception as exc:
        logger.warning("WebSocket auth failed: %s", exc)
        await websocket.close(code=4001, reason="Authentication failed")
        return

    await hub_manager.connect(websocket, user_id)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
                await handle_ws_message(user_id, data)
            except json.JSONDecodeError:
                logger.warning("Invalid JSON from %s", user_id)
    except WebSocketDisconnect:
        hub_manager.disconnect(user_id)
    except Exception:
        logger.error("WebSocket error for %s", user_id, exc_info=True)
        hub_manager.disconnect(user_id)
