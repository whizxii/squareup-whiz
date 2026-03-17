"""Standalone seed script — raw SQL, no ORM, runs against production DB."""
import asyncio
import json
import uuid
from datetime import datetime

import asyncpg
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth

DB_HOST = "aws-1-ap-northeast-1.pooler.supabase.com"
DB_USER = "postgres.mcvwlkibxewmbqajrkhz"
DB_PASS = "SqUp@1!2@3#"
DB_NAME = "postgres"
FIREBASE_CREDENTIALS = "./firebase-credentials.json"

SEED_CHANNELS = [
    {"name": "general", "type": "public", "description": "General team chat",  "icon": "💬"},
    {"name": "random",  "type": "public", "description": "Watercooler chat",   "icon": "🎲"},
]

SEED_USERS = [
    {
        "email": "kunjdhamsaniya@gmail.com",
        "password": "Qwer@1234",
        "display_name": "Kunj",
        "office_x": 3, "office_y": 3,
        "avatar_config": {"type": "character", "hairStyle": 1, "hairColor": "#3B2F2F",
                          "skinTone": "#D2A679", "shirtColor": "#FF6B00", "pantsColor": "#3B4252"},
    },
    {
        "email": "tvnale@gmail.com",
        "password": "Qwer@1234",
        "display_name": "Tanmay",
        "office_x": 6, "office_y": 3,
        "avatar_config": {"type": "character", "hairStyle": 0, "hairColor": "#1a1a1a",
                          "skinTone": "#C68642", "shirtColor": "#4a90d9", "pantsColor": "#2d3436"},
    },
    {
        "email": "paramjhade24@gmail.com",
        "password": "Qwer@1234",
        "display_name": "Param",
        "office_x": 9, "office_y": 3,
        "avatar_config": {"type": "character", "hairStyle": 3, "hairColor": "#2C1810",
                          "skinTone": "#D4A574", "shirtColor": "#27ae60", "pantsColor": "#34495e"},
    },
]


async def run():
    # Init Firebase Admin
    cred = credentials.Certificate(FIREBASE_CREDENTIALS)
    firebase_admin.initialize_app(cred)
    print("✓ Firebase Admin initialized")

    conn = await asyncpg.connect(
        host=DB_HOST, port=5432, user=DB_USER, password=DB_PASS, database=DB_NAME, ssl="require"
    )
    print("✓ DB connected")
    now = datetime.utcnow()

    try:
        # 0. Channels
        channels_created = 0
        channel_ids = {}

        for ch in SEED_CHANNELS:
            row = await conn.fetchrow(
                "SELECT id FROM channels WHERE name = $1 AND is_default = TRUE", ch["name"]
            )
            if row:
                channel_ids[ch["name"]] = str(row["id"])
                print(f"  channel #{ch['name']}: already exists ({row['id']})")
            else:
                cid = str(uuid.uuid4())
                await conn.execute(
                    """INSERT INTO channels (id, name, type, description, icon, is_default, is_private, is_archived, created_at, updated_at)
                       VALUES ($1, $2, $3, $4, $5, TRUE, FALSE, FALSE, $6, $6)""",
                    cid, ch["name"], ch["type"], ch["description"], ch["icon"], now,
                )
                channel_ids[ch["name"]] = cid
                channels_created += 1
                print(f"  channel #{ch['name']}: created ({cid})")

        # 1-3. Users
        for user_data in SEED_USERS:
            email = user_data["email"]
            print(f"\n→ {email}")

            # Firebase
            firebase_uid = None
            try:
                fb_user = firebase_auth.get_user_by_email(email)
                firebase_uid = fb_user.uid
                print(f"  firebase: already exists ({firebase_uid})")
            except firebase_auth.UserNotFoundError:
                fb_user = firebase_auth.create_user(
                    email=email,
                    password=user_data["password"],
                    display_name=user_data["display_name"],
                )
                firebase_uid = fb_user.uid
                print(f"  firebase: created ({firebase_uid})")

            # UserProfile
            existing = await conn.fetchrow(
                "SELECT firebase_uid FROM user_profiles WHERE firebase_uid = $1", firebase_uid
            )
            if existing:
                await conn.execute(
                    """UPDATE user_profiles
                       SET office_x = $1, office_y = $2, avatar_config = $3, display_name = $4
                       WHERE firebase_uid = $5""",
                    user_data["office_x"],
                    user_data["office_y"],
                    json.dumps(user_data["avatar_config"]),
                    user_data["display_name"],
                    firebase_uid,
                )
                print(f"  profile: updated")
            else:
                await conn.execute(
                    """INSERT INTO user_profiles
                       (firebase_uid, display_name, email, avatar_config, office_x, office_y,
                        status, theme, last_seen_at, created_at)
                       VALUES ($1, $2, $3, $4, $5, $6, 'online', 'system', $7, $7)""",
                    firebase_uid,
                    user_data["display_name"],
                    email,
                    json.dumps(user_data["avatar_config"]),
                    user_data["office_x"],
                    user_data["office_y"],
                    now,
                )
                print(f"  profile: created")

            # Channel memberships
            joined = 0
            for ch_name, ch_id in channel_ids.items():
                existing_member = await conn.fetchrow(
                    "SELECT channel_id FROM channel_members WHERE channel_id = $1 AND user_id = $2",
                    ch_id, firebase_uid,
                )
                if not existing_member:
                    await conn.execute(
                        """INSERT INTO channel_members (channel_id, user_id, role, last_read_at, muted, joined_at)
                           VALUES ($1, $2, 'member', $3, FALSE, $3)""",
                        ch_id, firebase_uid, now,
                    )
                    joined += 1
            print(f"  channels joined: {joined}")

    finally:
        await conn.close()

    print(f"\n✓ Done. channels_created={channels_created}")


if __name__ == "__main__":
    asyncio.run(run())
