"""CRM Tags API — tag CRUD and contact-tag association."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.db import get_session
from app.core.responses import ApiError, success_response
from app.models.crm_tag import CRMTag, CRMContactTag

router = APIRouter(prefix="/api/crm/v2", tags=["crm-tags"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class TagCreateBody(BaseModel):
    name: str = Field(..., max_length=100)
    color: Optional[str] = Field(default=None, max_length=7)


class TagUpdateBody(BaseModel):
    name: Optional[str] = Field(default=None, max_length=100)
    color: Optional[str] = Field(default=None, max_length=7)


class TagResponse(BaseModel):
    id: str
    name: str
    color: Optional[str] = None
    created_by: Optional[str] = None

    model_config = {"from_attributes": True}


class TagAssignBody(BaseModel):
    tag_id: str


# ---------------------------------------------------------------------------
# Tag CRUD
# ---------------------------------------------------------------------------


@router.post("/tags", status_code=status.HTTP_201_CREATED)
async def create_tag(
    body: TagCreateBody,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """Create a new tag."""
    tag = CRMTag(name=body.name, color=body.color, created_by=user_id)
    session.add(tag)
    await session.commit()
    await session.refresh(tag)
    return success_response(TagResponse.model_validate(tag))


@router.get("/tags")
async def list_tags(
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """List all tags."""
    result = await session.execute(select(CRMTag).order_by(CRMTag.name.asc()))
    tags = list(result.scalars().all())
    return success_response([TagResponse.model_validate(t).model_dump() for t in tags])


@router.put("/tags/{tag_id}")
async def update_tag(
    tag_id: str,
    body: TagUpdateBody,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """Update an existing tag."""
    tag = await session.get(CRMTag, tag_id)
    if tag is None:
        raise ApiError(status_code=404, detail="Tag not found")

    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(tag, field, value)

    session.add(tag)
    await session.commit()
    await session.refresh(tag)
    return success_response(TagResponse.model_validate(tag))


@router.delete("/tags/{tag_id}", status_code=status.HTTP_200_OK)
async def delete_tag(
    tag_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """Delete a tag and all its associations."""
    tag = await session.get(CRMTag, tag_id)
    if tag is None:
        raise ApiError(status_code=404, detail="Tag not found")

    # Remove all contact-tag associations
    assoc_result = await session.execute(
        select(CRMContactTag).where(CRMContactTag.tag_id == tag_id)
    )
    for assoc in assoc_result.scalars().all():
        await session.delete(assoc)

    await session.delete(tag)
    await session.commit()
    return success_response({"deleted": True})


# ---------------------------------------------------------------------------
# Contact-Tag associations
# ---------------------------------------------------------------------------


@router.post("/contacts/{contact_id}/tags", status_code=status.HTTP_201_CREATED)
async def add_tag_to_contact(
    contact_id: str,
    body: TagAssignBody,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """Link a tag to a contact."""
    # Verify tag exists
    tag = await session.get(CRMTag, body.tag_id)
    if tag is None:
        raise ApiError(status_code=404, detail="Tag not found")

    # Check if already linked
    existing = await session.execute(
        select(CRMContactTag).where(
            CRMContactTag.contact_id == contact_id,
            CRMContactTag.tag_id == body.tag_id,
        )
    )
    if existing.scalars().first():
        return success_response({"linked": True, "already_existed": True})

    link = CRMContactTag(contact_id=contact_id, tag_id=body.tag_id)
    session.add(link)
    await session.commit()
    return success_response({"linked": True, "already_existed": False})


@router.delete("/contacts/{contact_id}/tags/{tag_id}")
async def remove_tag_from_contact(
    contact_id: str,
    tag_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """Unlink a tag from a contact."""
    result = await session.execute(
        select(CRMContactTag).where(
            CRMContactTag.contact_id == contact_id,
            CRMContactTag.tag_id == tag_id,
        )
    )
    link = result.scalars().first()
    if link is None:
        raise ApiError(status_code=404, detail="Tag association not found")

    await session.delete(link)
    await session.commit()
    return success_response({"unlinked": True})


@router.get("/contacts/{contact_id}/tags")
async def get_contact_tags(
    contact_id: str,
    session: AsyncSession = Depends(get_session),
    user_id: str = Depends(get_current_user),
):
    """Get all tags for a contact."""
    result = await session.execute(
        select(CRMTag)
        .join(CRMContactTag, CRMContactTag.tag_id == CRMTag.id)
        .where(CRMContactTag.contact_id == contact_id)
    )
    tags = list(result.scalars().all())
    return success_response([TagResponse.model_validate(t).model_dump() for t in tags])
