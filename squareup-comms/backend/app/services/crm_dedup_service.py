"""Deduplication service — scan for duplicates, merge contacts.

Uses SQL-based grouping (GROUP BY) to find candidate duplicate groups,
then scores within groups — avoids O(n²) full-table pairwise comparison.
"""

from __future__ import annotations

import json
from typing import Any, Callable

from sqlalchemy import func, select

from app.models.crm import CRMContact
from app.models.crm_audit import CRMAuditLog
from app.services.base import BaseService

# Characters to strip when normalizing phone numbers
_PHONE_STRIP = str.maketrans("", "", " -+()")

# Minimum name length for fuzzy prefix blocking
_MIN_NAME_PREFIX = 3


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
        """Scan contacts for potential duplicates using SQL-based grouping.

        Instead of loading all contacts and comparing every pair O(n²),
        uses GROUP BY queries to find candidate groups and scores within
        those groups only.
        """
        matches: list[DedupMatch] = []
        seen_pairs: set[tuple[str, str]] = set()

        # Phase 1: Exact email duplicates (highest confidence signal)
        email_groups = await self._email_groups()
        self._score_groups(email_groups, matches, seen_pairs, limit)

        # Phase 2: Exact phone duplicates
        if len(matches) < limit:
            phone_groups = await self._phone_groups()
            self._score_groups(phone_groups, matches, seen_pairs, limit)

        # Phase 3: Exact name duplicates
        if len(matches) < limit:
            name_groups = await self._name_groups()
            self._score_groups(name_groups, matches, seen_pairs, limit)

        # Phase 4: Fuzzy name matching via prefix blocking
        if len(matches) < limit:
            fuzzy_groups = await self._fuzzy_name_groups()
            self._score_groups(fuzzy_groups, matches, seen_pairs, limit)

        matches.sort(key=lambda m: m.confidence, reverse=True)
        return [m.to_dict() for m in matches[:limit]]

    # ------------------------------------------------------------------
    # SQL-based group finders
    # ------------------------------------------------------------------

    async def _email_groups(self) -> list[list[CRMContact]]:
        """Find contacts sharing the same email (case-insensitive)."""
        email_lower = func.lower(CRMContact.email)
        stmt = (
            select(email_lower.label("k"))
            .where(
                CRMContact.is_archived == False,  # noqa: E712
                CRMContact.email.isnot(None),
                CRMContact.email != "",
            )
            .group_by(email_lower)
            .having(func.count() > 1)
        )
        dupe_keys = [r[0] for r in await self.session.execute(stmt)]
        if not dupe_keys:
            return []

        result = await self.session.execute(
            select(CRMContact).where(
                CRMContact.is_archived == False,  # noqa: E712
                email_lower.in_(dupe_keys),
            )
        )
        return _group_contacts(
            result.scalars().all(),
            lambda c: c.email.lower() if c.email else None,
        )

    async def _phone_groups(self) -> list[list[CRMContact]]:
        """Find contacts sharing the same phone (normalized in Python)."""
        result = await self.session.execute(
            select(CRMContact).where(
                CRMContact.is_archived == False,  # noqa: E712
                CRMContact.phone.isnot(None),
                CRMContact.phone != "",
            )
        )
        return _group_contacts(
            result.scalars().all(),
            lambda c: (c.phone or "").translate(_PHONE_STRIP) or None,
        )

    async def _name_groups(self) -> list[list[CRMContact]]:
        """Find contacts sharing the exact same name (case-insensitive)."""
        name_lower = func.lower(CRMContact.name)
        stmt = (
            select(name_lower.label("k"))
            .where(
                CRMContact.is_archived == False,  # noqa: E712
                CRMContact.name.isnot(None),
                CRMContact.name != "",
            )
            .group_by(name_lower)
            .having(func.count() > 1)
        )
        dupe_keys = [r[0] for r in await self.session.execute(stmt)]
        if not dupe_keys:
            return []

        result = await self.session.execute(
            select(CRMContact).where(
                CRMContact.is_archived == False,  # noqa: E712
                name_lower.in_(dupe_keys),
            )
        )
        return _group_contacts(
            result.scalars().all(),
            lambda c: c.name.lower().strip() if c.name else None,
        )

    async def _fuzzy_name_groups(self) -> list[list[CRMContact]]:
        """Fuzzy name matching via prefix blocking.

        Groups contacts by the first 3 characters of their lowercase name,
        then only compares within blocks — O(n × block_size²) instead of O(n²).
        """
        result = await self.session.execute(
            select(CRMContact).where(
                CRMContact.is_archived == False,  # noqa: E712
                CRMContact.name.isnot(None),
                CRMContact.name != "",
                func.length(CRMContact.name) >= _MIN_NAME_PREFIX,
            )
        )
        return _group_contacts(
            result.scalars().all(),
            lambda c: (
                c.name.lower().strip()[:_MIN_NAME_PREFIX]
                if c.name and len(c.name.strip()) >= _MIN_NAME_PREFIX
                else None
            ),
        )

    # ------------------------------------------------------------------
    # Scoring
    # ------------------------------------------------------------------

    def _score_groups(
        self,
        groups: list[list[CRMContact]],
        matches: list[DedupMatch],
        seen_pairs: set[tuple[str, str]],
        limit: int,
    ) -> None:
        """Score pairwise within each group and append matches above threshold."""
        for group in groups:
            for i, a in enumerate(group):
                for b in group[i + 1 :]:
                    if len(matches) >= limit:
                        return

                    pair_key = (min(a.id, b.id), max(a.id, b.id))
                    if pair_key in seen_pairs:
                        continue
                    seen_pairs.add(pair_key)

                    confidence, reasons = self._compute_similarity(a, b)
                    if confidence >= 0.4:
                        matches.append(
                            DedupMatch(
                                contact_a_id=a.id,
                                contact_b_id=b.id,
                                confidence=confidence,
                                match_reasons=reasons,
                            )
                        )

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
        a_phone = (a.phone or "").translate(_PHONE_STRIP)
        b_phone = (b.phone or "").translate(_PHONE_STRIP)
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
            elif _levenshtein(a_name, b_name) <= 3:
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

    # ------------------------------------------------------------------
    # Administrative
    # ------------------------------------------------------------------

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


# ------------------------------------------------------------------
# Module-level helpers
# ------------------------------------------------------------------


def _group_contacts(
    contacts: Any,
    key_fn: Callable[[CRMContact], str | None],
) -> list[list[CRMContact]]:
    """Group contacts by a key function, returning only groups with 2+ members."""
    groups: dict[str, list[CRMContact]] = {}
    for c in contacts:
        key = key_fn(c)
        if key:
            groups.setdefault(key, []).append(c)
    return [g for g in groups.values() if len(g) > 1]


def _levenshtein(s1: str, s2: str) -> int:
    """Compute Levenshtein distance between two strings."""
    if len(s1) < len(s2):
        return _levenshtein(s2, s1)

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
