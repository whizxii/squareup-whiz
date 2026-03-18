"""Deduplication service — scan for duplicates, merge contacts."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Sequence

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col

from app.models.crm import CRMContact
from app.models.crm_audit import CRMAuditLog
from app.services.base import BaseService


class DedupMatch:
    """Represents a pair of potential duplicate contacts."""

    __slots__ = ("contact_a_id", "contact_b_id", "confidence", "match_reasons")

    def __init__(
        self,
        contact_a_id: str,
        contact_b_id: str,
        confidence: float,
        match_reasons: list[str],
    ) -> None:
        self.contact_a_id = contact_a_id
        self.contact_b_id = contact_b_id
        self.confidence = confidence
        self.match_reasons = match_reasons

    def to_dict(self) -> dict[str, Any]:
        return {
            "contact_a_id": self.contact_a_id,
            "contact_b_id": self.contact_b_id,
            "confidence": self.confidence,
            "match_reasons": self.match_reasons,
        }


class DedupService(BaseService):
    """Deduplication engine for CRM contacts."""

    async def scan_duplicates(self, limit: int = 100) -> list[dict[str, Any]]:
        """Scan all active contacts for potential duplicates.

        Returns grouped duplicate sets with confidence scores.
        Uses: exact email match, fuzzy name match, same phone, same name+company.
        """
        result = await self.session.execute(
            select(CRMContact)
            .where(CRMContact.is_archived == False)  # noqa: E712
            .order_by(CRMContact.created_at.asc())
        )
        contacts = list(result.scalars().all())

        matches: list[DedupMatch] = []
        seen_pairs: set[tuple[str, str]] = set()

        for i, a in enumerate(contacts):
            for b in contacts[i + 1:]:
                pair_key = (min(a.id, b.id), max(a.id, b.id))
                if pair_key in seen_pairs:
                    continue

                confidence, reasons = self._compute_similarity(a, b)
                if confidence >= 0.4:
                    matches.append(DedupMatch(
                        contact_a_id=a.id,
                        contact_b_id=b.id,
                        confidence=confidence,
                        match_reasons=reasons,
                    ))
                    seen_pairs.add(pair_key)

                if len(matches) >= limit:
                    break
            if len(matches) >= limit:
                break

        # Sort by confidence descending
        matches.sort(key=lambda m: m.confidence, reverse=True)
        return [m.to_dict() for m in matches]

    def _compute_similarity(
        self, a: CRMContact, b: CRMContact
    ) -> tuple[float, list[str]]:
        """Compute similarity score between two contacts. Returns (score, reasons)."""
        score = 0.0
        reasons: list[str] = []

        # Exact email match (very strong signal)
        if a.email and b.email and a.email.lower() == b.email.lower():
            score += 0.9
            reasons.append("exact_email")

        # Exact phone match
        a_phone = (a.phone or "").replace(" ", "").replace("-", "").replace("+", "")
        b_phone = (b.phone or "").replace(" ", "").replace("-", "").replace("+", "")
        if a_phone and b_phone and a_phone == b_phone:
            score += 0.7
            reasons.append("exact_phone")

        # Name similarity
        a_name = (a.name or "").lower().strip()
        b_name = (b.name or "").lower().strip()
        if a_name and b_name:
            if a_name == b_name:
                score += 0.6
                reasons.append("exact_name")
            elif self._levenshtein(a_name, b_name) <= 3:
                score += 0.3
                reasons.append("similar_name")

        # Same name + same company (strong signal)
        a_company = (a.company or "").lower().strip()
        b_company = (b.company or "").lower().strip()
        if a_name and b_name and a_company and b_company:
            if a_name == b_name and a_company == b_company:
                score += 0.5
                reasons.append("same_name_company")

        # Cap at 1.0
        return min(score, 1.0), reasons

    @staticmethod
    def _levenshtein(s1: str, s2: str) -> int:
        """Compute Levenshtein distance between two strings."""
        if len(s1) < len(s2):
            return DedupService._levenshtein(s2, s1)

        if len(s2) == 0:
            return len(s1)

        prev_row = list(range(len(s2) + 1))
        for i, c1 in enumerate(s1):
            curr_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = prev_row[j + 1] + 1
                deletions = curr_row[j] + 1
                substitutions = prev_row[j] + (c1 != c2)
                curr_row.append(min(insertions, deletions, substitutions))
            prev_row = curr_row

        return prev_row[-1]

    async def dismiss_match(
        self, contact_a_id: str, contact_b_id: str, user_id: str
    ) -> bool:
        """Dismiss a duplicate suggestion by logging it as dismissed."""
        audit = CRMAuditLog(
            entity_type="dedup",
            entity_id=f"{contact_a_id}:{contact_b_id}",
            action="dismiss",
            changes=json.dumps({"dismissed_by": user_id}),
            performed_by=user_id,
        )
        self.session.add(audit)
        await self.session.commit()
        return True
