"""Seed the database with default data for local development.

Usage:
    cd backend
    python -m scripts.seed
"""

import asyncio
import sys
import os

# Ensure the backend package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import select
from app.core.db import async_session, init_db
from app.models.users import UserProfile
from app.models.chat import Channel, ChannelMember
from app.models.agents import Agent


DEV_USER = UserProfile(
    firebase_uid="dev-user-001",
    display_name="Dev User",
    nickname="dev",
    email="dev@squareup.local",
    status="online",
    office_x=5,
    office_y=5,
)

DEFAULT_CHANNELS = [
    Channel(
        id="ch-general",
        name="general",
        type="public",
        description="Company-wide announcements and discussion",
        icon="#",
        is_default=True,
        created_by="dev-user-001",
    ),
    Channel(
        id="ch-random",
        name="random",
        type="public",
        description="Water cooler chat, memes, off-topic",
        icon="#",
        is_default=True,
        created_by="dev-user-001",
    ),
    Channel(
        id="ch-engineering",
        name="engineering",
        type="public",
        description="Engineering discussions and code reviews",
        icon="#",
        is_default=False,
        created_by="dev-user-001",
    ),
]

SEED_AGENTS = [
    Agent(
        id="agent-research",
        name="Research Assistant",
        description="Helps with research questions, summarizes documents, and finds information.",
        system_prompt=(
            "You are a helpful research assistant for SquareUp. "
            "Answer questions clearly and concisely. Cite sources when possible."
        ),
        model="llama-3.3-70b-versatile",
        trigger_mode="mention",
        office_x=12,
        office_y=3,
        office_station_icon="🔬",
        created_by="dev-user-001",
    ),
    Agent(
        id="agent-writer",
        name="Content Writer",
        description="Drafts emails, blog posts, and marketing copy.",
        system_prompt=(
            "You are a professional content writer for SquareUp. "
            "Write clear, engaging copy. Match the tone requested by the user."
        ),
        model="llama-3.3-70b-versatile",
        trigger_mode="mention",
        office_x=14,
        office_y=3,
        office_station_icon="✍️",
        created_by="dev-user-001",
    ),
    Agent(
        id="agent-code",
        name="Code Review Bot",
        description="Reviews code snippets, suggests improvements, and explains errors.",
        system_prompt=(
            "You are a senior software engineer at SquareUp. "
            "Review code for correctness, readability, and performance. Be constructive."
        ),
        model="llama-3.3-70b-versatile",
        trigger_mode="mention",
        office_x=16,
        office_y=3,
        office_station_icon="💻",
        created_by="dev-user-001",
    ),
]


async def seed():
    await init_db()

    async with async_session() as session:
        # --- Dev user ---
        existing_user = await session.get(UserProfile, DEV_USER.firebase_uid)
        if existing_user is None:
            session.add(DEV_USER)
            print(f"  + User: {DEV_USER.display_name} ({DEV_USER.firebase_uid})")
        else:
            print(f"  ~ User already exists: {existing_user.firebase_uid}")

        # --- Channels ---
        for ch in DEFAULT_CHANNELS:
            existing = await session.get(Channel, ch.id)
            if existing is None:
                session.add(ch)
                print(f"  + Channel: #{ch.name}")
            else:
                print(f"  ~ Channel already exists: #{existing.name}")

        await session.commit()

        # --- Channel memberships (dev user joins all channels) ---
        for ch in DEFAULT_CHANNELS:
            stmt = select(ChannelMember).where(
                ChannelMember.channel_id == ch.id,
                ChannelMember.user_id == DEV_USER.firebase_uid,
            )
            result = await session.exec(stmt)
            if result.first() is None:
                member = ChannelMember(
                    channel_id=ch.id,
                    user_id=DEV_USER.firebase_uid,
                    role="admin",
                )
                session.add(member)
                print(f"  + Membership: {DEV_USER.firebase_uid} -> #{ch.name}")

        # --- Agents ---
        for agent in SEED_AGENTS:
            existing = await session.get(Agent, agent.id)
            if existing is None:
                session.add(agent)
                print(f"  + Agent: {agent.name}")
            else:
                print(f"  ~ Agent already exists: {existing.name}")

        await session.commit()

    print("\nSeed complete.")


if __name__ == "__main__":
    print("Seeding database...")
    asyncio.run(seed())
