"""Pipeline repository — data access for CRM pipelines."""

from __future__ import annotations

from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.crm_pipeline import CRMPipeline
from app.repositories.base import BaseRepository


class PipelineRepository(BaseRepository[CRMPipeline]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(CRMPipeline, session)

    async def get_default(self) -> CRMPipeline | None:
        """Fetch the default pipeline."""
        result = await self._session.execute(
            select(CRMPipeline).where(
                CRMPipeline.is_default == True,  # noqa: E712
                CRMPipeline.is_archived == False,  # noqa: E712
            )
        )
        return result.scalars().first()

    async def list_active(self) -> Sequence[CRMPipeline]:
        """List all non-archived pipelines."""
        result = await self._session.execute(
            select(CRMPipeline)
            .where(CRMPipeline.is_archived == False)  # noqa: E712
            .order_by(CRMPipeline.is_default.desc(), CRMPipeline.name.asc())
        )
        return list(result.scalars().all())

    async def ensure_single_default(self, pipeline_id: str) -> None:
        """Ensure only the given pipeline is default — unset all others."""
        result = await self._session.execute(
            select(CRMPipeline).where(
                CRMPipeline.is_default == True,  # noqa: E712
                CRMPipeline.id != pipeline_id,
            )
        )
        for p in result.scalars().all():
            p.is_default = False
            self._session.add(p)
        await self._session.commit()
