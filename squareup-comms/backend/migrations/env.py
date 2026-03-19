import asyncio
import sys
import os
from logging.config import fileConfig

# Add parent directory to path so 'app' module is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

from app.core.config import settings
from app.models.users import UserProfile  # noqa: F401
from app.models.chat import Channel, ChannelMember, Message, Reaction  # noqa: F401
from app.models.agents import Agent, AgentExecution  # noqa: F401
from app.models.crm import CRMContact, CRMActivity  # noqa: F401
from app.models.crm_company import CRMCompany  # noqa: F401
from app.models.crm_tag import CRMTag, CRMContactTag  # noqa: F401
from app.models.crm_note import CRMNote  # noqa: F401
from app.models.crm_audit import CRMAuditLog  # noqa: F401
from app.models.crm_pipeline import CRMPipeline  # noqa: F401
from app.models.crm_deal import CRMDeal  # noqa: F401
from app.models.crm_email import CRMEmail  # noqa: F401
from app.models.crm_sequence import CRMEmailSequence, CRMSequenceEnrollment  # noqa: F401
from app.models.crm_calendar import CRMCalendarEvent  # noqa: F401
from app.models.crm_recording import CRMCallRecording  # noqa: F401
from app.models.crm_workflow import CRMWorkflow, CRMWorkflowExecution  # noqa: F401
from app.models.crm_smart_list import CRMSmartList  # noqa: F401
from app.models.files import File  # noqa: F401
from app.models.notifications import Notification  # noqa: F401
from app.models.integrations import IntegrationConfig  # noqa: F401
from app.models.custom_tools import CustomTool  # noqa: F401
from app.models.reminders import Reminder  # noqa: F401
from app.models.tasks import Task  # noqa: F401

from sqlmodel import SQLModel

config = context.config

# Escape % for ConfigParser interpolation (URL-encoded passwords contain %)
db_url = settings.DATABASE_URL
config.set_main_option("sqlalchemy.url", db_url.replace("%", "%%"))

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations():
    engine_kwargs = {}
    if "asyncpg" in db_url:
        engine_kwargs["connect_args"] = {
            "prepared_statement_cache_size": 0,
            "statement_cache_size": 0,
        }
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        **engine_kwargs,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
