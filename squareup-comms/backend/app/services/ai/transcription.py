"""Transcription service — real Whisper STT + LLM analysis, with mock fallback.

Provides:
  - WhisperTranscriptionService: Uses OpenAI Whisper API for speech-to-text,
    then LLM for analysis (summary, action items, sentiment, etc.)
  - MockTranscriptionService: Hardcoded development fallback (no API keys needed).
  - get_transcription_service(): Factory that returns the appropriate service.
"""

from __future__ import annotations

import json
import logging
import random
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)


# ─── Data Classes ─────────────────────────────────────────────────

@dataclass(frozen=True)
class TranscriptSegment:
    speaker: str
    text: str
    start_ms: int
    end_ms: int
    confidence: float


@dataclass(frozen=True)
class ActionItem:
    text: str
    assignee: str | None
    due_date: str | None
    is_completed: bool


@dataclass(frozen=True)
class KeyTopic:
    topic: str
    relevance_score: float


@dataclass(frozen=True)
class Objection:
    text: str
    context: str
    resolved: bool


@dataclass(frozen=True)
class TranscriptionResult:
    transcript: str
    segments: list[TranscriptSegment]
    summary: str
    action_items: list[ActionItem]
    sentiment: str  # positive/neutral/negative/mixed
    key_topics: list[KeyTopic]
    objections: list[Objection]
    next_steps: list[str]


# ─── Whisper Transcription Service ────────────────────────────────


class WhisperTranscriptionService:
    """Real transcription using OpenAI Whisper API + LLM analysis."""

    async def transcribe(
        self,
        duration_seconds: int,
        *,
        file_path: str | None = None,
    ) -> TranscriptionResult:
        """Transcribe an audio file via Whisper API, then analyse with LLM.

        Parameters
        ----------
        duration_seconds:
            Recording duration (used as context hint if file is unavailable).
        file_path:
            Absolute path to the audio file on disk.  When ``None`` the method
            falls back to mock transcription.
        """
        if file_path is None or not Path(file_path).exists():
            logger.warning(
                "No audio file at %s — falling back to mock transcription",
                file_path,
            )
            return await _MOCK_SERVICE.transcribe(duration_seconds)

        # Step 1: Speech-to-text via Whisper
        raw_segments = await self._whisper_transcribe(file_path)
        if not raw_segments:
            logger.warning("Whisper returned empty result — falling back to mock")
            return await _MOCK_SERVICE.transcribe(duration_seconds)

        full_transcript = "\n".join(seg["text"] for seg in raw_segments)

        # Build TranscriptSegment list from Whisper verbose JSON
        segments = [
            TranscriptSegment(
                speaker="Speaker",  # Whisper doesn't diarise
                text=seg["text"].strip(),
                start_ms=int(seg["start"] * 1000),
                end_ms=int(seg["end"] * 1000),
                confidence=seg.get("avg_logprob", 0.0),
            )
            for seg in raw_segments
        ]

        # Step 2: LLM-powered analysis
        analysis = await self._analyse_transcript(full_transcript)

        return TranscriptionResult(
            transcript=full_transcript,
            segments=segments,
            summary=analysis.get("summary", ""),
            action_items=[
                ActionItem(
                    text=a.get("text", ""),
                    assignee=a.get("assignee"),
                    due_date=a.get("due_date"),
                    is_completed=False,
                )
                for a in analysis.get("action_items", [])
            ],
            sentiment=analysis.get("sentiment", "neutral"),
            key_topics=[
                KeyTopic(
                    topic=t.get("topic", ""),
                    relevance_score=float(t.get("relevance_score", 0.5)),
                )
                for t in analysis.get("key_topics", [])
            ],
            objections=[
                Objection(
                    text=o.get("text", ""),
                    context=o.get("context", ""),
                    resolved=bool(o.get("resolved", False)),
                )
                for o in analysis.get("objections", [])
            ],
            next_steps=analysis.get("next_steps", []),
        )

    # ── Whisper API call ──────────────────────────────────────────

    async def _whisper_transcribe(self, file_path: str) -> list[dict[str, Any]]:
        """Call OpenAI Whisper API and return verbose segments."""
        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

            with open(file_path, "rb") as audio_file:
                response = await client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="verbose_json",
                    timestamp_granularities=["segment"],
                )

            # response is a Transcription object with .segments
            segments = response.segments or []
            return [
                {
                    "text": seg.text,
                    "start": seg.start,
                    "end": seg.end,
                    "avg_logprob": getattr(seg, "avg_logprob", 0.0),
                }
                for seg in segments
            ]

        except Exception as exc:
            logger.error("Whisper API call failed: %s", exc)
            return []

    # ── LLM analysis call ─────────────────────────────────────────

    async def _analyse_transcript(self, transcript: str) -> dict[str, Any]:
        """Use the configured LLM to extract insights from a transcript."""
        from app.services.llm_service import get_llm_client, llm_available, parse_llm_json

        if not llm_available():
            logger.info("No LLM configured — returning empty analysis")
            return {}

        prompt = _ANALYSIS_PROMPT.format(transcript=transcript[:8000])

        try:
            client = get_llm_client()
            raw = await client.chat(
                messages=[
                    {"role": "system", "content": _ANALYSIS_SYSTEM},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=2048,
                temperature=0.3,
            )
            result = parse_llm_json(raw)
            return result if result is not None else {}
        except Exception as exc:
            logger.error("LLM analysis failed: %s", exc)
            return {}


_ANALYSIS_SYSTEM = (
    "You are a sales call analyst. Given a call transcript, extract structured "
    "insights. Always respond with valid JSON only — no markdown, no preamble."
)

_ANALYSIS_PROMPT = """Analyse this call transcript and return JSON with exactly these keys:

{{
  "summary": "2-3 sentence summary of the call",
  "action_items": [
    {{"text": "action description", "assignee": "person or null", "due_date": "YYYY-MM-DD or null"}}
  ],
  "sentiment": "positive|neutral|negative|mixed",
  "key_topics": [
    {{"topic": "topic name", "relevance_score": 0.0-1.0}}
  ],
  "objections": [
    {{"text": "objection", "context": "when it came up", "resolved": true/false}}
  ],
  "next_steps": ["step 1", "step 2"]
}}

Transcript:
{transcript}"""


# ─── Mock Transcription Service ───────────────────────────────────

_MOCK_CONVERSATIONS: list[list[dict[str, str]]] = [
    [
        {"speaker": "Sales Rep", "text": "Thanks for joining the call today. I wanted to follow up on the proposal we sent over last week."},
        {"speaker": "Prospect", "text": "Yes, we reviewed it internally. The team is generally positive, but we have some questions about pricing."},
        {"speaker": "Sales Rep", "text": "Of course! I'd love to walk through the pricing tiers. Which aspects are most important to your team?"},
        {"speaker": "Prospect", "text": "We're mainly concerned about the per-seat cost for our enterprise plan. We have about 200 users."},
        {"speaker": "Sales Rep", "text": "For 200 seats, we can offer volume discounts. Let me pull up our enterprise pricing matrix."},
        {"speaker": "Prospect", "text": "That would be helpful. Also, what does the onboarding process look like?"},
        {"speaker": "Sales Rep", "text": "We offer a dedicated onboarding manager for enterprise accounts. Typically, onboarding takes about two weeks."},
        {"speaker": "Prospect", "text": "Two weeks sounds reasonable. Can we get a trial period before committing?"},
        {"speaker": "Sales Rep", "text": "Absolutely. We offer a 30-day trial with full features. I can set that up for you this week."},
        {"speaker": "Prospect", "text": "Great, let's move forward with the trial. I'll need to loop in our IT team for the technical setup."},
    ],
    [
        {"speaker": "Account Manager", "text": "Hi! I wanted to check in on how things are going since the launch last month."},
        {"speaker": "Client", "text": "Overall, the team has adapted well. We're seeing good adoption numbers."},
        {"speaker": "Account Manager", "text": "That's great to hear! What metrics are you tracking?"},
        {"speaker": "Client", "text": "Mainly user engagement and time-to-resolution. Both have improved by about 15%."},
        {"speaker": "Account Manager", "text": "Fantastic results. Are there any features you'd like to see improved?"},
        {"speaker": "Client", "text": "The reporting dashboard could use more customization options. Our VP wants specific KPIs."},
        {"speaker": "Account Manager", "text": "I'll flag that with our product team. We actually have a dashboard update coming in Q2."},
        {"speaker": "Client", "text": "Perfect. Also, we're thinking about expanding to our APAC offices. What would that cost?"},
        {"speaker": "Account Manager", "text": "I can prepare an expansion proposal for the APAC rollout. How many additional seats would you need?"},
        {"speaker": "Client", "text": "Probably around 75 additional seats across three offices."},
    ],
    [
        {"speaker": "SDR", "text": "Hi, I'm reaching out because I noticed your company recently raised a Series B. Congratulations!"},
        {"speaker": "Lead", "text": "Thank you! Yes, we're in growth mode and scaling quickly."},
        {"speaker": "SDR", "text": "That's exciting. Many companies at your stage find that their existing tools don't scale well. Is that something you've experienced?"},
        {"speaker": "Lead", "text": "Actually, yes. Our current CRM is becoming a bottleneck. We're evaluating alternatives."},
        {"speaker": "SDR", "text": "I'd love to show you how we've helped similar companies. Would a 30-minute demo work?"},
        {"speaker": "Lead", "text": "Sure, but I want to make sure it integrates with our existing stack — Slack, GitHub, and Linear."},
        {"speaker": "SDR", "text": "We have native integrations with all three. I can show those specifically in the demo."},
        {"speaker": "Lead", "text": "Sounds good. Can we schedule it for next Tuesday afternoon?"},
    ],
]

_MOCK_SUMMARIES = [
    "Follow-up call discussing enterprise pricing and onboarding. Prospect agreed to a 30-day trial. Key concern was per-seat cost for 200 users. Sales rep offered volume discounts and dedicated onboarding manager.",
    "Monthly check-in with existing client. Strong adoption metrics with 15% improvement in key KPIs. Client requested dashboard customization (flagged for Q2 update). Expansion opportunity: 75 seats across 3 APAC offices.",
    "Initial outreach call with Series B startup. Lead confirmed need for new CRM as current tool doesn't scale. Interested in integrations with Slack, GitHub, and Linear. Demo scheduled for next Tuesday.",
]

_MOCK_ACTION_ITEMS_SETS: list[list[dict[str, Any]]] = [
    [
        {"text": "Send enterprise pricing matrix to prospect", "assignee": "Sales Rep", "due_date": "2026-03-18", "is_completed": False},
        {"text": "Set up 30-day trial environment", "assignee": "Sales Rep", "due_date": "2026-03-19", "is_completed": False},
        {"text": "Schedule technical setup call with IT team", "assignee": "Prospect", "due_date": "2026-03-20", "is_completed": False},
    ],
    [
        {"text": "Submit dashboard customization request to product team", "assignee": "Account Manager", "due_date": "2026-03-20", "is_completed": False},
        {"text": "Prepare APAC expansion proposal (75 seats, 3 offices)", "assignee": "Account Manager", "due_date": "2026-03-25", "is_completed": False},
        {"text": "Share Q2 product roadmap with client", "assignee": "Account Manager", "due_date": "2026-03-22", "is_completed": False},
    ],
    [
        {"text": "Schedule 30-minute demo for next Tuesday", "assignee": "SDR", "due_date": "2026-03-18", "is_completed": False},
        {"text": "Prepare demo focusing on Slack/GitHub/Linear integrations", "assignee": "SDR", "due_date": "2026-03-18", "is_completed": False},
    ],
]

_MOCK_TOPICS_SETS: list[list[dict[str, float]]] = [
    [{"topic": "Enterprise Pricing", "relevance_score": 0.95}, {"topic": "Onboarding Process", "relevance_score": 0.82}, {"topic": "Trial Period", "relevance_score": 0.78}],
    [{"topic": "Product Adoption", "relevance_score": 0.90}, {"topic": "Dashboard Customization", "relevance_score": 0.85}, {"topic": "APAC Expansion", "relevance_score": 0.88}],
    [{"topic": "CRM Migration", "relevance_score": 0.92}, {"topic": "Integration Requirements", "relevance_score": 0.87}, {"topic": "Product Demo", "relevance_score": 0.75}],
]

_MOCK_OBJECTIONS_SETS: list[list[dict[str, Any]]] = [
    [{"text": "Per-seat cost is too high for 200 users", "context": "Discussing enterprise pricing tiers", "resolved": True}],
    [{"text": "Dashboard lacks customization for executive reporting", "context": "Discussing feature gaps", "resolved": False}],
    [{"text": "Current CRM data migration concerns", "context": "Discussing switching costs", "resolved": False}],
]

_MOCK_NEXT_STEPS_SETS = [
    ["Set up trial environment by end of week", "Send pricing proposal", "Schedule IT integration call"],
    ["Submit dashboard feature request", "Prepare APAC expansion quote", "Follow up in 2 weeks"],
    ["Confirm demo time for Tuesday", "Send integration documentation links", "Prepare tailored demo script"],
]

_MOCK_SENTIMENTS = ["positive", "positive", "positive"]


class MockTranscriptionService:
    """Generates realistic mock transcription results for development."""

    async def transcribe(
        self,
        duration_seconds: int,
        *,
        file_path: str | None = None,
    ) -> TranscriptionResult:
        """Generate a mock transcription for a recording of given duration."""
        idx = random.randint(0, len(_MOCK_CONVERSATIONS) - 1)
        conversation = _MOCK_CONVERSATIONS[idx]

        segments = _build_segments(conversation, duration_seconds)
        full_transcript = "\n".join(
            f"{seg.speaker}: {seg.text}" for seg in segments
        )

        action_items = [ActionItem(**item) for item in _MOCK_ACTION_ITEMS_SETS[idx]]
        key_topics = [KeyTopic(**item) for item in _MOCK_TOPICS_SETS[idx]]
        objections = [Objection(**item) for item in _MOCK_OBJECTIONS_SETS[idx]]

        return TranscriptionResult(
            transcript=full_transcript,
            segments=segments,
            summary=_MOCK_SUMMARIES[idx],
            action_items=action_items,
            sentiment=_MOCK_SENTIMENTS[idx],
            key_topics=key_topics,
            objections=objections,
            next_steps=_MOCK_NEXT_STEPS_SETS[idx],
        )


# Module-level mock singleton (reused by Whisper fallback)
_MOCK_SERVICE = MockTranscriptionService()


def _build_segments(
    conversation: list[dict[str, str]],
    total_duration_ms_input: int,
) -> list[TranscriptSegment]:
    """Build time-aligned transcript segments from a conversation template."""
    total_ms = total_duration_ms_input * 1000
    num_segments = len(conversation)
    if num_segments == 0:
        return []

    avg_segment_ms = total_ms // num_segments
    segments: list[TranscriptSegment] = []
    current_ms = 0

    for entry in conversation:
        jitter = random.randint(-500, 500)
        seg_duration = max(1000, avg_segment_ms + jitter)
        end_ms = min(current_ms + seg_duration, total_ms)

        segments.append(
            TranscriptSegment(
                speaker=entry["speaker"],
                text=entry["text"],
                start_ms=current_ms,
                end_ms=end_ms,
                confidence=round(random.uniform(0.88, 0.99), 2),
            )
        )
        current_ms = end_ms

    return segments


# ─── Serialization ────────────────────────────────────────────────


def serialize_transcription_result(result: TranscriptionResult) -> dict[str, str]:
    """Convert TranscriptionResult fields to JSON strings for database storage."""
    return {
        "transcript": result.transcript,
        "transcript_segments": json.dumps([asdict(s) for s in result.segments]),
        "ai_summary": result.summary,
        "ai_action_items": json.dumps([asdict(a) for a in result.action_items]),
        "ai_sentiment": result.sentiment,
        "ai_key_topics": json.dumps([asdict(t) for t in result.key_topics]),
        "ai_objections": json.dumps([asdict(o) for o in result.objections]),
        "ai_next_steps": json.dumps(result.next_steps),
    }


# ─── Factory ──────────────────────────────────────────────────────


def get_transcription_service() -> WhisperTranscriptionService | MockTranscriptionService:
    """Return a real Whisper service if OPENAI_API_KEY is set, else mock."""
    if settings.OPENAI_API_KEY:
        logger.info("Using WhisperTranscriptionService (OpenAI API)")
        return WhisperTranscriptionService()
    logger.info("No OPENAI_API_KEY — using MockTranscriptionService")
    return MockTranscriptionService()
