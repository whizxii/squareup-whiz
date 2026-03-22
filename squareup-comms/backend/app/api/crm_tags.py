"""CRM Tags API — tag CRUD and contact-tag association."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field

from app.api.deps import get_tag_service
from app.core.auth import get_current_user
from app.core.responses import ApiError, success_response
from app.services.crm_tag_service import TagService

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
    svc: TagService = Depends(get_tag_service),
    user_id: str = Depends(get_current_user),
):
    """Create a new tag."""
    tag = await svc.create_tag(body.model_dump(), user_id)
    return success_response(TagResponse.model_validate(tag))


@router.get("/tags")
async def list_tags(
    svc: TagService = Depends(get_tag_service),
    user_id: str = Depends(get_current_user),
):
    """List all tags."""
    tags = await svc.list_all()
    return success_response([TagResponse.model_validate(t).model_dump() for t in tags])


@router.put("/tags/{tag_id}")
async def update_tag(
    tag_id: str,
    body: TagUpdateBody,
    svc: TagService = Depends(get_tag_service),
    user_id: str = Depends(get_current_user),
):
    """Update an existing tag."""
    updates = body.model_dump(exclude_unset=True)
    tag = await svc.update_tag(tag_id, updates, user_id)
    if tag is None:
        raise ApiError(status_code=404, detail="Tag not found")
    return success_response(TagResponse.model_validate(tag))


@router.delete("/tags/{tag_id}", status_code=status.HTTP_200_OK)
async def delete_tag(
    tag_id: str,
    svc: TagService = Depends(get_tag_service),
    user_id: str = Depends(get_current_user),
):
    """Delete a tag and all its associations."""
    deleted = await svc.delete_tag(tag_id, user_id)
    if not deleted:
        raise ApiError(status_code=404, detail="Tag not found")
    return success_response({"deleted": True})


# ---------------------------------------------------------------------------
# Contact-Tag associations
# ---------------------------------------------------------------------------


@router.post("/contacts/{contact_id}/tags", status_code=status.HTTP_201_CREATED)
async def add_tag_to_contact(
    contact_id: str,
    body: TagAssignBody,
    svc: TagService = Depends(get_tag_service),
    user_id: str = Depends(get_current_user),
):
    """Link a tag to a contact."""
    result = await svc.add_tag_to_contact(contact_id, body.tag_id, user_id)
    if not result.get("found"):
        raise ApiError(status_code=404, detail="Tag not found")
    return success_response({
        "linked": result["linked"],
        "already_existed": result["already_existed"],
    })


@router.delete("/contacts/{contact_id}/tags/{tag_id}")
async def remove_tag_from_contact(
    contact_id: str,
    tag_id: str,
    svc: TagService = Depends(get_tag_service),
    user_id: str = Depends(get_current_user),
):
    """Unlink a tag from a contact."""
    removed = await svc.remove_tag_from_contact(contact_id, tag_id)
    if not removed:
        raise ApiError(status_code=404, detail="Tag association not found")
    return success_response({"unlinked": True})


@router.get("/contacts/{contact_id}/tags")
async def get_contact_tags(
    contact_id: str,
    svc: TagService = Depends(get_tag_service),
    user_id: str = Depends(get_current_user),
):
    """Get all tags for a contact."""
    tags = await svc.get_contact_tags(contact_id)
    return success_response([TagResponse.model_validate(t).model_dump() for t in tags])
