from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import json

from app.core.config import settings
from app.core.db import init_db
from app.websocket.manager import hub_manager
from app.websocket.handlers import handle_ws_message
from app.api.channels import router as channels_router
from app.api.messages import router as messages_router
from app.api.crm import router as crm_router
from app.api.agents import router as agents_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting SquareUp Comms backend...")
    await init_db()
    logger.info("Database initialized.")
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# REST API routers
app.include_router(channels_router)
app.include_router(messages_router)
app.include_router(crm_router)
app.include_router(agents_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "squareup-comms"}


@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(default=None),
):
    """Multiplexed WebSocket endpoint.

    Authenticate via ?token=<firebase_token> query param.
    For dev mode, connects as dev-user-001 if no token.
    """
    # TODO: Validate Firebase token in production
    user_id = "dev-user-001"  # Dev mode default

    await hub_manager.connect(websocket, user_id)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
                await handle_ws_message(user_id, data)
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON from {user_id}")
    except WebSocketDisconnect:
        hub_manager.disconnect(user_id)
    except Exception as e:
        logger.error(f"WebSocket error for {user_id}: {e}")
        hub_manager.disconnect(user_id)
