"""One-time seed endpoint to bootstrap channels and the 3 team member accounts.

All seed endpoints require either:
- Dev mode (ENABLE_DEV_AUTH=true) — for local development
- A valid authenticated user — for staging/production initial setup
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException, Security, status
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.config import settings
from app.core.db import get_session
from app.core.auth import get_current_user
from app.models.users import UserProfile
from app.models.chat import Channel, ChannelMember
from app.models.crm import CRMContact, CRMActivity
from app.models.crm_deal import CRMDeal
from app.models.crm_pipeline import CRMPipeline
from app.models.crm_company import CRMCompany
from app.models.automation_log import AutomationLog
from app.models.ai_insight import AIInsight

logger = logging.getLogger(__name__)

_bearer_scheme = HTTPBearer(auto_error=False)
router = APIRouter(prefix="/api/seed", tags=["seed"])

# Default channels to create if missing
SEED_CHANNELS = [
    {
        "name": "general",
        "type": "public",
        "description": "General team chat",
        "icon": "\U0001f4ac",
        "is_default": True,
    },
    {
        "name": "random",
        "type": "public",
        "description": "Watercooler chat",
        "icon": "\U0001f3b2",
        "is_default": True,
    },
]

# The 3 team members to pre-create
SEED_USERS = [
    {
        "email": "kunjdhamsaniya@gmail.com",
        "password": "Qwer@1234",
        "display_name": "Kunj",
        "office_x": 3,
        "office_y": 3,
        "avatar_config": {
            "type": "character",
            "hairStyle": 1,
            "hairColor": "#3B2F2F",
            "skinTone": "#D2A679",
            "shirtColor": "#FF6B00",
            "pantsColor": "#3B4252",
        },
    },
    {
        "email": "tvnale@gmail.com",
        "password": "Qwer@1234",
        "display_name": "Tanmay",
        "office_x": 6,
        "office_y": 3,
        "avatar_config": {
            "type": "character",
            "hairStyle": 0,
            "hairColor": "#1a1a1a",
            "skinTone": "#C68642",
            "shirtColor": "#4a90d9",
            "pantsColor": "#2d3436",
        },
    },
    {
        "email": "paramjhade24@gmail.com",
        "password": "Qwer@1234",
        "display_name": "Param",
        "office_x": 9,
        "office_y": 3,
        "avatar_config": {
            "type": "character",
            "hairStyle": 3,
            "hairColor": "#2C1810",
            "skinTone": "#D4A574",
            "shirtColor": "#27ae60",
            "pantsColor": "#34495e",
        },
    },
]


async def _get_or_create_supabase_user(email: str, password: str, display_name: str) -> tuple[str | None, str]:
    """Create a Supabase Auth user or retrieve the existing one.

    Returns (user_id, status) where status is 'created', 'already_exists', or 'error: ...'.
    Uses Supabase Admin API via service key.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        return None, "error: SUPABASE_URL or SUPABASE_SERVICE_KEY not configured"

    base_url = settings.SUPABASE_URL
    headers = {
        "apikey": settings.SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient() as client:
        # Try to create the user
        resp = await client.post(
            f"{base_url}/auth/v1/admin/users",
            headers=headers,
            json={
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"display_name": display_name},
            },
        )

        if resp.status_code == 200:
            user_id = resp.json().get("id")
            return user_id, "created"

        # If user already exists, look them up
        if resp.status_code == 422 or "already" in resp.text.lower():
            # List users and find by email
            list_resp = await client.get(
                f"{base_url}/auth/v1/admin/users",
                headers=headers,
                params={"page": 1, "per_page": 100},
            )
            if list_resp.status_code == 200:
                users = list_resp.json().get("users", [])
                for u in users:
                    if u.get("email") == email:
                        return u["id"], "already_exists"

        return None, f"error: {resp.status_code} {resp.text[:200]}"


@router.get("/debug")
async def seed_debug(
    _user_id: str = Depends(get_current_user),
) -> dict:
    """Debug endpoint to check config — requires authentication.

    Never exposes secret values or prefixes.
    """
    if not settings.ENABLE_DEV_AUTH:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Debug endpoint is only available in dev mode.",
        )
    return {
        "supabase_url_set": bool(settings.SUPABASE_URL),
        "supabase_service_key_set": bool(settings.SUPABASE_SERVICE_KEY),
        "supabase_jwt_secret_set": bool(settings.SUPABASE_JWT_SECRET),
    }


@router.post("/debug-token")
async def debug_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(_bearer_scheme),
) -> dict:
    """Debug endpoint to diagnose JWT verification — dev mode only.

    Does NOT require get_current_user since the whole point is to debug
    broken tokens. Instead, gated behind ENABLE_DEV_AUTH.
    """
    if not settings.ENABLE_DEV_AUTH:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token debug endpoint is only available in dev mode.",
        )

    if not credentials or not credentials.credentials:
        return {"error": "No Bearer token provided"}

    token = credentials.credentials
    result: dict = {}

    # Decode header without verification
    try:
        header = jwt.get_unverified_header(token)
        result["header"] = {"alg": header.get("alg"), "typ": header.get("typ")}
    except Exception as e:
        result["header_error"] = str(e)

    # Decode claims without verification — redact sensitive fields
    try:
        claims = jwt.get_unverified_claims(token)
        safe_keys = {"sub", "aud", "exp", "iat", "iss", "role"}
        result["claims"] = {k: v for k, v in claims.items() if k in safe_keys}
    except Exception as e:
        result["claims_error"] = str(e)

    # Try to verify with HS256 — only report success/failure, no secret details
    secret = settings.SUPABASE_JWT_SECRET or ""
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"], options={"verify_aud": False})
        result["verify_hs256"] = "SUCCESS"
        result["sub"] = payload.get("sub")
    except Exception as e:
        result["verify_hs256"] = f"FAILED: {type(e).__name__}"

    return result


@router.post("/users")
async def seed_users(
    _user_id: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Create default channels + Supabase auth accounts + UserProfile rows.

    Requires authentication. Only available in dev mode.
    Idempotent: skips items that already exist.
    """
    if not settings.ENABLE_DEV_AUTH:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seed endpoint is only available in dev mode.",
        )
    try:
        return await _seed_users_impl(session)
    except Exception as exc:
        logger.exception("seed_users failed")
        return JSONResponse(
            status_code=500,
            content={"error": str(exc), "type": type(exc).__name__},
        )


async def _seed_users_impl(session: AsyncSession) -> dict:
    results: list[dict] = []
    now = datetime.utcnow()

    # 0. Ensure default channels exist
    channels_created = 0
    stmt = select(Channel).where(Channel.is_default == True)  # noqa: E712
    result = await session.execute(stmt)
    existing_channels = {c.name: c for c in result.scalars().all()}

    for ch_data in SEED_CHANNELS:
        if ch_data["name"] not in existing_channels:
            channel = Channel(
                name=ch_data["name"],
                type=ch_data["type"],
                description=ch_data["description"],
                icon=ch_data["icon"],
                is_default=True,
                is_private=False,
                created_at=now,
                updated_at=now,
            )
            session.add(channel)
            existing_channels[ch_data["name"]] = channel
            channels_created += 1

    await session.flush()  # Assign IDs before foreign-key references
    default_channels = list(existing_channels.values())

    for user_data in SEED_USERS:
        email = user_data["email"]
        entry: dict = {"email": email, "status": "skipped"}

        # 1. Create Supabase auth user (or get existing)
        user_id, auth_status = await _get_or_create_supabase_user(
            email, user_data["password"], user_data["display_name"],
        )
        entry["auth"] = auth_status

        if not user_id:
            results.append(entry)
            continue

        # 2. Create or update UserProfile row
        #    Check by UID first, then by email to avoid creating duplicates
        existing = await session.get(UserProfile, user_id)
        if not existing:
            # Check if a profile exists with same email but different UID
            email_stmt = select(UserProfile).where(UserProfile.email == email)
            email_result = await session.execute(email_stmt)
            existing = email_result.scalars().first()

        if existing:
            existing.office_x = user_data["office_x"]
            existing.office_y = user_data["office_y"]
            existing.avatar_config = json.dumps(user_data["avatar_config"])
            existing.display_name = user_data["display_name"]
            session.add(existing)
            entry["profile"] = "updated"
            entry["status"] = "updated"
            # Use the existing profile's UID for channel membership
            user_id = existing.firebase_uid
        else:
            profile = UserProfile(
                firebase_uid=user_id,
                display_name=user_data["display_name"],
                email=email,
                avatar_config=json.dumps(user_data["avatar_config"]),
                office_x=user_data["office_x"],
                office_y=user_data["office_y"],
                status="online",
                last_seen_at=now,
                created_at=now,
            )
            session.add(profile)
            entry["profile"] = "created"
            entry["status"] = "created"

        # 3. Auto-join default channels
        channels_joined = 0
        for channel in default_channels:
            existing_member = await session.get(
                ChannelMember, (channel.id, user_id)
            )
            if not existing_member:
                member = ChannelMember(
                    channel_id=channel.id,
                    user_id=user_id,
                    role="member",
                )
                session.add(member)
                channels_joined += 1
        entry["channels_joined"] = channels_joined

        results.append(entry)

    await session.commit()
    return {"channels_created": channels_created, "seeded": results}


@router.post("/cleanup-duplicates")
async def cleanup_duplicate_profiles(
    _user_id: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Remove duplicate user_profiles rows for the same email.

    Requires authentication. Only available in dev mode.

    For each email that appears more than once in user_profiles:
    1. Query Supabase Auth admin API to find the canonical UID for that email.
    2. Keep the profile whose firebase_uid matches the Supabase auth user.
    3. Migrate all channel_members, messages, channels.created_by, and reactions
       from the duplicate UID to the canonical UID.
    4. Delete the duplicate profile row.

    Idempotent — safe to call multiple times.
    """
    if not settings.ENABLE_DEV_AUTH:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cleanup endpoint is only available in dev mode.",
        )
    try:
        return await _cleanup_duplicates_impl(session)
    except Exception as exc:
        logger.exception("cleanup_duplicate_profiles failed")
        return JSONResponse(
            status_code=500,
            content={"error": str(exc), "type": type(exc).__name__},
        )


async def _get_supabase_uid_for_email(email: str) -> str | None:
    """Look up the Supabase Auth UID for a given email via the admin API."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        return None

    headers = {
        "apikey": settings.SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
    }

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.SUPABASE_URL}/auth/v1/admin/users",
            headers=headers,
            params={"page": 1, "per_page": 100},
        )
        if resp.status_code != 200:
            return None
        for u in resp.json().get("users", []):
            if u.get("email") == email:
                return u["id"]
    return None


async def _cleanup_duplicates_impl(session: AsyncSession) -> dict:
    from sqlalchemy import text

    # Collect all profiles to check for duplicates
    all_profiles_result = await session.execute(select(UserProfile))
    all_profiles = all_profiles_result.scalars().all()

    # Build email → canonical Supabase UID map
    all_emails = {p.email for p in all_profiles if p.email}
    email_to_canonical_uid: dict[str, str | None] = {}
    for email in all_emails:
        email_to_canonical_uid[email] = await _get_supabase_uid_for_email(email)

    removed: list[dict] = []
    kept: list[dict] = []
    migrated_refs: list[dict] = []

    # Group profiles by email
    email_to_profiles: dict[str, list[UserProfile]] = {}
    for p in all_profiles:
        email_key = p.email or p.firebase_uid
        email_to_profiles.setdefault(email_key, []).append(p)

    for email, profiles in email_to_profiles.items():
        canonical_uid = email_to_canonical_uid.get(email)

        if len(profiles) == 1 and profiles[0].firebase_uid == canonical_uid:
            kept.append({"email": email, "uid": canonical_uid})
            continue

        if len(profiles) == 1 and canonical_uid and profiles[0].firebase_uid != canonical_uid:
            # Single profile but wrong UID — unlikely but handle it
            kept.append({"email": email, "uid": profiles[0].firebase_uid, "note": "no canonical match, kept only profile"})
            continue

        # Multiple profiles — keep the one matching canonical UID
        keep_profile = None
        delete_profiles = []

        for p in profiles:
            if canonical_uid and p.firebase_uid == canonical_uid:
                keep_profile = p
            else:
                delete_profiles.append(p)

        # If no profile matches the canonical UID, keep the most recent one
        if not keep_profile:
            profiles_sorted = sorted(profiles, key=lambda p: p.created_at, reverse=True)
            keep_profile = profiles_sorted[0]
            delete_profiles = profiles_sorted[1:]

        kept.append({"email": email, "uid": keep_profile.firebase_uid})

        # Migrate references from each duplicate to the kept profile
        for dup in delete_profiles:
            old_uid = dup.firebase_uid
            new_uid = keep_profile.firebase_uid
            ref_count = 0

            # Migrate channel_members (delete if conflict, else update)
            existing_memberships = await session.execute(
                select(ChannelMember).where(ChannelMember.user_id == old_uid)
            )
            for membership in existing_memberships.scalars().all():
                # Check if the kept user already has this membership
                kept_membership = await session.get(
                    ChannelMember, (membership.channel_id, new_uid)
                )
                if kept_membership:
                    await session.delete(membership)
                else:
                    await session.execute(
                        text("UPDATE channel_members SET user_id = :new WHERE channel_id = :cid AND user_id = :old"),
                        {"new": new_uid, "cid": membership.channel_id, "old": old_uid},
                    )
                ref_count += 1

            # Migrate messages.sender_id
            msg_result = await session.execute(
                text("UPDATE messages SET sender_id = :new WHERE sender_id = :old"),
                {"new": new_uid, "old": old_uid},
            )
            ref_count += msg_result.rowcount

            # Migrate channels.created_by
            ch_result = await session.execute(
                text("UPDATE channels SET created_by = :new WHERE created_by = :old"),
                {"new": new_uid, "old": old_uid},
            )
            ref_count += ch_result.rowcount

            # Migrate reactions.user_id (delete if conflict)
            await session.execute(
                text(
                    "DELETE FROM reactions WHERE user_id = :old "
                    "AND (message_id, emoji) IN ("
                    "  SELECT r2.message_id, r2.emoji FROM reactions r2 WHERE r2.user_id = :new"
                    ")"
                ),
                {"old": old_uid, "new": new_uid},
            )
            rxn_result = await session.execute(
                text("UPDATE reactions SET user_id = :new WHERE user_id = :old"),
                {"new": new_uid, "old": old_uid},
            )
            ref_count += rxn_result.rowcount

            migrated_refs.append({
                "from_uid": old_uid,
                "to_uid": new_uid,
                "email": email,
                "refs_migrated": ref_count,
            })

            # Delete the duplicate profile
            await session.delete(dup)
            removed.append({"email": email, "uid": old_uid})

    await session.commit()
    return {
        "kept": kept,
        "removed": removed,
        "migrated_refs": migrated_refs,
        "summary": f"Removed {len(removed)} duplicate profiles, kept {len(kept)}",
    }


@router.post("/crm-demo")
async def seed_crm_demo(
    user_id: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Seed the CRM with realistic demo data (contacts, deals, activities, etc.).

    Idempotent: returns {already_seeded: true} if a pipeline named 'Sales Pipeline' exists.
    Requires normal authentication (no dev-auth gate).
    """
    try:
        return await _seed_crm_demo_impl(session, user_id)
    except Exception as exc:
        logger.exception("seed_crm_demo failed")
        return JSONResponse(
            status_code=500,
            content={"error": str(exc), "type": type(exc).__name__},
        )


async def _seed_crm_demo_impl(session: AsyncSession, seeded_by: str) -> dict:
    now = datetime.utcnow()

    # Idempotency check
    existing_pipeline = await session.execute(
        select(CRMPipeline).where(CRMPipeline.name == "Sales Pipeline")
    )
    if existing_pipeline.scalars().first():
        return {"already_seeded": True}

    # ── 1. Pipeline ──────────────────────────────────────────────────────────
    pipeline_stages = json.dumps([
        {"id": "lead", "label": "Lead", "order": 0, "color": "#6B7280", "probability": 10, "sla_days": 7},
        {"id": "qualified", "label": "Qualified", "order": 1, "color": "#3B82F6", "probability": 30, "sla_days": 14},
        {"id": "proposal", "label": "Proposal", "order": 2, "color": "#F59E0B", "probability": 60, "sla_days": 10},
        {"id": "negotiation", "label": "Negotiation", "order": 3, "color": "#8B5CF6", "probability": 80, "sla_days": 7},
        {"id": "won", "label": "Won", "order": 4, "color": "#10B981", "probability": 100, "sla_days": 0},
    ])
    pipeline = CRMPipeline(
        id=str(uuid.uuid4()),
        name="Sales Pipeline",
        description="Default B2B sales pipeline",
        stages=pipeline_stages,
        is_default=True,
        is_archived=False,
        created_by=seeded_by,
        created_at=now,
        updated_at=now,
    )
    session.add(pipeline)
    await session.flush()

    # ── 2. Companies ─────────────────────────────────────────────────────────
    companies_data = [
        {"name": "Acme Corp", "domain": "acmecorp.com", "industry": "SaaS", "size": "51-200", "website": "https://acmecorp.com", "employee_count": 120, "annual_revenue": 8500000.0},
        {"name": "Bluewave Technologies", "domain": "bluewave.io", "industry": "FinTech", "size": "11-50", "website": "https://bluewave.io", "employee_count": 38, "annual_revenue": 3200000.0},
        {"name": "Greenfield Labs", "domain": "greenfield.ai", "industry": "HealthTech", "size": "1-10", "website": "https://greenfield.ai", "employee_count": 9, "annual_revenue": 750000.0},
    ]
    companies: dict[str, CRMCompany] = {}
    for cd in companies_data:
        company = CRMCompany(
            id=str(uuid.uuid4()),
            name=cd["name"],
            domain=cd["domain"],
            industry=cd["industry"],
            size=cd["size"],
            website=cd["website"],
            employee_count=cd["employee_count"],
            annual_revenue=cd["annual_revenue"],
            is_archived=False,
            created_by=seeded_by,
            created_at=now - timedelta(days=90),
            updated_at=now,
        )
        session.add(company)
        companies[cd["name"]] = company
    await session.flush()

    # ── 3. Contacts ──────────────────────────────────────────────────────────
    contacts_data = [
        {"name": "Priya Sharma", "email": "priya@acmecorp.com", "phone": "+91 98765 43210", "company": "Acme Corp", "title": "Chief Technology Officer", "stage": "qualified", "lead_score": 78, "value": 450000.0, "source": "LinkedIn", "notes": "Interested in enterprise license. Follow up after Q2 budget review."},
        {"name": "Rohit Verma", "email": "rohit@bluewave.io", "phone": "+91 99887 12345", "company": "Bluewave Technologies", "title": "VP of Sales", "stage": "proposal", "lead_score": 85, "value": 280000.0, "source": "Referral", "notes": "Evaluating us vs Salesforce. Strong relationship — met at SaaS India conference."},
        {"name": "Sarah Chen", "email": "sarah@greenfield.ai", "phone": "+1 415 555 0192", "company": "Greenfield Labs", "title": "Chief Executive Officer", "stage": "lead", "lead_score": 42, "value": 85000.0, "source": "Cold outreach", "notes": "Seed-stage startup. Budget tight but high growth potential."},
        {"name": "Marcus Johnson", "email": "marcus@acmecorp.com", "phone": "+91 98900 11223", "company": "Acme Corp", "title": "Head of Product", "stage": "negotiation", "lead_score": 91, "value": 320000.0, "source": "Inbound", "notes": "Decision maker for product suite upgrade. Final legal review in progress."},
        {"name": "Ananya Patel", "email": "ananya@bluewave.io", "phone": "+91 97766 55443", "company": "Bluewave Technologies", "title": "Procurement Manager", "stage": "lead", "lead_score": 35, "value": 150000.0, "source": "Website", "notes": "Initial inquiry via website. Needs technical evaluation."},
        {"name": "David Kim", "email": "david@greenfield.ai", "phone": "+1 650 555 0134", "company": "Greenfield Labs", "title": "Chief Operating Officer", "stage": "qualified", "lead_score": 62, "value": 95000.0, "source": "Conference", "notes": "Met at HealthTech Summit. Interested in pilot program scope."},
        {"name": "Emma Wilson", "email": "emma@acmecorp.com", "phone": "+91 93344 22110", "company": "Acme Corp", "title": "Director of Engineering", "stage": "won", "lead_score": 95, "value": 320000.0, "source": "Referral", "notes": "Closed deal. Excellent champion. Ask for case study."},
        {"name": "Ravi Gupta", "email": "ravi@bluewave.io", "phone": "+91 96655 78901", "company": "Bluewave Technologies", "title": "Chief Financial Officer", "stage": "qualified", "lead_score": 71, "value": 195000.0, "source": "LinkedIn", "notes": "Budget holder. Q3 planning cycle starts next month."},
        {"name": "Neha Joshi", "email": "neha@greenfield.ai", "phone": "+1 415 555 0289", "company": "Greenfield Labs", "title": "VP Marketing", "stage": "proposal", "lead_score": 58, "value": 110000.0, "source": "Email campaign", "notes": "Responded to nurture sequence. Proposal sent — awaiting response."},
        {"name": "Tom Bradley", "email": "tom.bradley@outlook.com", "phone": "+1 312 555 0173", "company": None, "title": "CTO (Freelance Consultant)", "stage": "lead", "lead_score": 29, "value": 45000.0, "source": "Cold outreach", "notes": "Independent consultant. Exploring options for a client project."},
    ]

    stage_lifecycle_map = {
        "lead": "lead",
        "qualified": "mql",
        "proposal": "sql",
        "negotiation": "opportunity",
        "won": "customer",
    }

    contacts: list[CRMContact] = []
    for i, cd in enumerate(contacts_data):
        company_obj = companies.get(cd["company"]) if cd["company"] else None
        contact = CRMContact(
            id=str(uuid.uuid4()),
            name=cd["name"],
            email=cd["email"],
            phone=cd["phone"],
            company=cd["company"],
            company_id=company_obj.id if company_obj else None,
            title=cd["title"],
            stage=cd["stage"],
            stage_changed_at=now - timedelta(days=30 - i * 2),
            lifecycle_stage=stage_lifecycle_map.get(cd["stage"], "lead"),
            value=cd["value"],
            currency="INR",
            source=cd["source"],
            notes=cd["notes"],
            lead_score=cd["lead_score"],
            relationship_strength=max(1, min(10, cd["lead_score"] // 10)),
            activity_count=0,
            is_archived=False,
            created_by=seeded_by,
            created_by_type="user",
            created_at=now - timedelta(days=60 - i * 5),
            updated_at=now - timedelta(days=i),
            last_contacted_at=now - timedelta(days=i * 2 + 1),
            last_activity_at=now - timedelta(days=i * 2 + 1),
        )
        session.add(contact)
        contacts.append(contact)
    await session.flush()

    # ── 4. Deals ─────────────────────────────────────────────────────────────
    deals_data = [
        {"title": "Acme Corp — Enterprise License", "contact_idx": 0, "stage": "proposal", "value": 450000.0, "health": "yellow", "status": "open", "probability": 60, "days_to_close": 30},
        {"title": "Bluewave Q2 Expansion", "contact_idx": 1, "stage": "negotiation", "value": 280000.0, "health": "green", "status": "open", "probability": 80, "days_to_close": 14},
        {"title": "Greenfield Pilot Program", "contact_idx": 2, "stage": "lead", "value": 85000.0, "health": "red", "status": "open", "probability": 10, "days_to_close": 60},
        {"title": "Acme — Product Suite Upgrade", "contact_idx": 3, "stage": "won", "value": 320000.0, "health": "green", "status": "won", "probability": 100, "days_to_close": -7},
        {"title": "Bluewave — API Integration", "contact_idx": 4, "stage": "qualified", "value": 150000.0, "health": "green", "status": "open", "probability": 30, "days_to_close": 45},
    ]

    deals: list[CRMDeal] = []
    for dd in deals_data:
        contact = contacts[dd["contact_idx"]]
        deal = CRMDeal(
            id=str(uuid.uuid4()),
            title=dd["title"],
            contact_id=contact.id,
            company_id=contact.company_id,
            pipeline_id=pipeline.id,
            stage=dd["stage"],
            value=dd["value"],
            currency="INR",
            probability=dd["probability"],
            status=dd["status"],
            deal_health=dd["health"],
            stage_entered_at=now - timedelta(days=20),
            expected_close_date=now + timedelta(days=dd["days_to_close"]),
            actual_close_date=now - timedelta(days=7) if dd["status"] == "won" else None,
            owner_id=seeded_by,
            created_by=seeded_by,
            created_at=now - timedelta(days=45),
            updated_at=now - timedelta(days=1),
        )
        session.add(deal)
        deals.append(deal)
    await session.flush()

    # ── 5. Activities ─────────────────────────────────────────────────────────
    activities_raw = [
        (0, "email", "Initial outreach email sent", "Sent introduction email highlighting enterprise features and ROI case studies."),
        (0, "call", "Discovery call — Priya Sharma", "45-min call. Discussed integration needs, team size, and Q3 timeline. Very engaged."),
        (1, "meeting", "Product demo — Rohit Verma", "Live demo of the platform. Compared feature-by-feature against their current Salesforce setup."),
        (1, "email", "Proposal sent to Bluewave", "Sent detailed proposal with pricing tiers and implementation timeline."),
        (2, "call", "Intro call — Sarah Chen", "Brief 20-min call. Explained pilot program structure. Sarah interested but waiting for Series A close."),
        (3, "meeting", "Contract review with legal — Acme", "3-way call with Marcus, their legal team, and us. Addressed IP concerns."),
        (3, "note", "Deal won — Acme Product Suite", "Marcus signed the agreement. Kickoff call scheduled for next week. Great outcome!"),
        (4, "email", "Follow-up after website inquiry", "Sent technical specs and API documentation as requested by Ananya."),
        (5, "call", "Qualification call — David Kim", "Confirmed budget range and decision timeline. Strong fit for pilot."),
        (6, "meeting", "Kickoff call — Emma Wilson", "Post-close kickoff. Introduced implementation team. Emma very enthusiastic."),
        (7, "email", "Budget planning email to Ravi", "Shared pricing options and flexible payment terms to help with Q3 budget planning."),
        (8, "note", "Proposal follow-up needed", "Neha went quiet after proposal. Ping scheduled for Thursday with value-add content."),
        (9, "email", "Cold outreach — Tom Bradley", "Personalized email referencing his consulting background and client use case."),
        (0, "meeting", "Technical deep-dive — Acme", "2-hour session with Priya and her engineering team on integration architecture."),
        (2, "email", "Nurture email — Greenfield", "Sent HealthTech case study and ROI calculator to keep Sarah engaged."),
    ]

    for contact_idx, act_type, act_title, act_content in activities_raw:
        contact = contacts[contact_idx]
        activity = CRMActivity(
            id=str(uuid.uuid4()),
            contact_id=contact.id,
            type=act_type,
            title=act_title,
            content=act_content,
            performed_by=seeded_by,
            performer_type="user",
            performer_name="Team",
            created_at=now - timedelta(days=len(activities_raw) - activities_raw.index((contact_idx, act_type, act_title, act_content))),
        )
        session.add(activity)
        contact.activity_count = (contact.activity_count or 0) + 1
        session.add(contact)
    await session.flush()

    # ── 6. Automation Logs ────────────────────────────────────────────────────
    auto_logs = [
        {
            "action_type": "create_contact",
            "entity_type": "contact",
            "entity_id": contacts[0].id,
            "entity_name": "Priya Sharma",
            "confidence": 0.92,
            "status": "auto_executed",
            "ai_reasoning": "Chat message from Kunj mentioned 'meeting with Priya from Acme' — extracted contact name, company, and context with high confidence.",
            "source_event": "chat.message_analyzed",
            "result": json.dumps({"contact_id": contacts[0].id, "fields_set": ["name", "company", "title"]}),
        },
        {
            "action_type": "progress_deal",
            "entity_type": "deal",
            "entity_id": deals[1].id,
            "entity_name": "Bluewave Q2 Expansion",
            "confidence": 0.71,
            "status": "pending_review",
            "ai_reasoning": "Detected strong buying signal in last email ('ready to move forward') — suggesting advancing deal from Proposal to Negotiation stage. Confidence below threshold, flagged for review.",
            "source_event": "chat.message_analyzed",
            "result": None,
        },
        {
            "action_type": "schedule_followup",
            "entity_type": "contact",
            "entity_id": contacts[2].id,
            "entity_name": "Sarah Chen",
            "confidence": 0.83,
            "status": "approved",
            "ai_reasoning": "No activity on Greenfield Pilot for 12 days — auto-scheduled a follow-up reminder for the assigned owner.",
            "source_event": "schedule.stale_deal_check",
            "result": json.dumps({"follow_up_at": (now + timedelta(days=2)).isoformat(), "note": "Check in on Series A status"}),
            "reviewed_at": now - timedelta(hours=3),
            "reviewed_by": seeded_by,
        },
    ]

    for log_data in auto_logs:
        log = AutomationLog(
            id=str(uuid.uuid4()),
            action_type=log_data["action_type"],
            entity_type=log_data["entity_type"],
            entity_id=log_data["entity_id"],
            entity_name=log_data["entity_name"],
            confidence=log_data["confidence"],
            status=log_data["status"],
            performed_by="system",
            result=log_data.get("result"),
            ai_reasoning=log_data.get("ai_reasoning"),
            source_event=log_data.get("source_event"),
            review_notes=None,
            created_at=now - timedelta(hours=6),
            reviewed_at=log_data.get("reviewed_at"),
            reviewed_by=log_data.get("reviewed_by"),
        )
        session.add(log)

    # ── 7. AI Insights ────────────────────────────────────────────────────────
    insights = [
        AIInsight(
            id=str(uuid.uuid4()),
            type="daily_brief",
            severity="warning",
            title="3 deals need your attention today",
            description="Acme Enterprise License has been in Proposal stage for 18 days with no activity. Greenfield Pilot is at risk — no response in 12 days. Bluewave negotiation is hot and should be prioritized.",
            ai_reasoning="Analyzed deal pipeline health, last activity timestamps, and engagement patterns. Identified stalled deals based on stage SLA thresholds and contact silence periods.",
            suggested_actions=json.dumps([
                "Call Priya Sharma about the Acme deal — she mentioned Q2 budget deadline",
                "Send Neha Joshi a value-add follow-up for the Greenfield proposal",
                "Close Bluewave Q2 Expansion — Rohit is ready to sign",
            ]),
            target_user_id=seeded_by,
            entity_type=None,
            entity_id=None,
            entity_name=None,
            is_read=False,
            is_dismissed=False,
            is_acted_on=False,
            created_at=now - timedelta(hours=2),
        ),
        AIInsight(
            id=str(uuid.uuid4()),
            type="deal_coaching",
            severity="critical",
            title="Acme Enterprise License: High risk of stalling",
            description="This deal has been in the Proposal stage for 18 days without advancement. Priya Sharma's last response was 8 days ago — unusual given her typical 2-day response time. Risk score: 72/100.",
            ai_reasoning="Combined deal stage SLA breach (SLA: 10 days, current: 18 days), contact silence (8 days), and historical response pattern analysis. Similar deals that stalled at this stage had 65% loss rate.",
            suggested_actions=json.dumps([
                "Schedule a check-in call to uncover blockers",
                "Send a competitive comparison document — they may be evaluating alternatives",
                "Offer a phased pricing option to reduce commitment hesitation",
            ]),
            target_user_id=seeded_by,
            entity_type="deal",
            entity_id=deals[0].id,
            entity_name="Acme Corp — Enterprise License",
            is_read=False,
            is_dismissed=False,
            is_acted_on=False,
            created_at=now - timedelta(hours=1),
        ),
    ]
    for insight in insights:
        session.add(insight)

    await session.commit()

    return {
        "pipeline": 1,
        "companies": len(companies),
        "contacts": len(contacts),
        "deals": len(deals),
        "activities": len(activities_raw),
        "automation_logs": len(auto_logs),
        "insights": len(insights),
    }


@router.delete("/orphan/{uid}")
async def delete_orphan_profile(
    uid: str,
    _user_id: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Delete an orphan user profile by UID and clean up all FK references.

    Requires authentication. Only available in dev mode.
    """
    if not settings.ENABLE_DEV_AUTH:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Orphan cleanup endpoint is only available in dev mode.",
        )
    from sqlalchemy import text

    profile = await session.get(UserProfile, uid)
    if not profile:
        return {"error": f"No profile found for uid={uid}"}

    # Clean up FK references
    await session.execute(
        text("DELETE FROM channel_members WHERE user_id = :uid"),
        {"uid": uid},
    )
    await session.execute(
        text("DELETE FROM reactions WHERE user_id = :uid"),
        {"uid": uid},
    )
    await session.execute(
        text("DELETE FROM messages WHERE sender_id = :uid"),
        {"uid": uid},
    )
    await session.execute(
        text("UPDATE channels SET created_by = NULL WHERE created_by = :uid"),
        {"uid": uid},
    )

    await session.delete(profile)
    await session.commit()

    return {
        "deleted": uid,
        "email": profile.email,
        "display_name": profile.display_name,
    }
