"""LLM service with Anthropic (Claude) streaming + tool_use, and Groq fallback."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any, AsyncGenerator

from anthropic import AsyncAnthropic
from openai import AsyncOpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Stream event types
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class TextDelta:
    text: str


@dataclass(frozen=True)
class ToolUseStart:
    tool_use_id: str
    name: str


@dataclass(frozen=True)
class ToolUseComplete:
    tool_use_id: str
    name: str
    input: dict


@dataclass(frozen=True)
class UsageUpdate:
    input_tokens: int
    output_tokens: int


@dataclass(frozen=True)
class MessageComplete:
    stop_reason: str | None


StreamEvent = TextDelta | ToolUseStart | ToolUseComplete | UsageUpdate | MessageComplete


# ---------------------------------------------------------------------------
# Anthropic (Claude) client — primary
# ---------------------------------------------------------------------------

class AnthropicLLMClient:
    """Claude API with native tool_use and streaming."""

    def __init__(self, api_key: str) -> None:
        self._client = AsyncAnthropic(api_key=api_key)

    async def stream_with_tools(
        self,
        system: str,
        messages: list[dict],
        tools: list[dict] | None = None,
        model: str = "claude-sonnet-4-6",
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> AsyncGenerator[StreamEvent, None]:
        """Stream a Claude response, yielding StreamEvent objects.

        Handles text deltas, tool_use blocks, usage, and stop reasons.
        """
        kwargs: dict[str, Any] = {
            "model": model,
            "system": system,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if tools:
            kwargs["tools"] = tools

        async with self._client.messages.stream(**kwargs) as stream:
            current_tool_id: str | None = None
            current_tool_name: str | None = None
            tool_input_json = ""

            async for event in stream:
                event_type = event.type

                if event_type == "content_block_start":
                    block = event.content_block
                    if block.type == "tool_use":
                        current_tool_id = block.id
                        current_tool_name = block.name
                        tool_input_json = ""
                        yield ToolUseStart(
                            tool_use_id=block.id,
                            name=block.name,
                        )

                elif event_type == "content_block_delta":
                    delta = event.delta
                    if delta.type == "text_delta":
                        yield TextDelta(text=delta.text)
                    elif delta.type == "input_json_delta":
                        tool_input_json += delta.partial_json

                elif event_type == "content_block_stop":
                    if current_tool_id and current_tool_name:
                        parsed_input = {}
                        if tool_input_json:
                            try:
                                parsed_input = json.loads(tool_input_json)
                            except json.JSONDecodeError:
                                logger.warning(
                                    "Failed to parse tool input JSON for %s",
                                    current_tool_name,
                                )
                        yield ToolUseComplete(
                            tool_use_id=current_tool_id,
                            name=current_tool_name,
                            input=parsed_input,
                        )
                        current_tool_id = None
                        current_tool_name = None
                        tool_input_json = ""

                elif event_type == "message_delta":
                    stop_reason = getattr(event.delta, "stop_reason", None)
                    usage = getattr(event, "usage", None)
                    if usage:
                        yield UsageUpdate(
                            input_tokens=getattr(usage, "input_tokens", 0),
                            output_tokens=getattr(usage, "output_tokens", 0),
                        )
                    yield MessageComplete(stop_reason=stop_reason)

                elif event_type == "message_start":
                    usage = getattr(event.message, "usage", None)
                    if usage:
                        yield UsageUpdate(
                            input_tokens=getattr(usage, "input_tokens", 0),
                            output_tokens=getattr(usage, "output_tokens", 0),
                        )

    async def chat(
        self,
        messages: list[dict],
        system: str = "",
        model: str = "claude-sonnet-4-6",
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> str:
        """Simple non-streaming chat completion."""
        response = await self._client.messages.create(
            model=model,
            system=system,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        text_parts = []
        for block in response.content:
            if block.type == "text":
                text_parts.append(block.text)
        return "".join(text_parts)


# ---------------------------------------------------------------------------
# Groq (OpenAI-compatible) client — fallback
# ---------------------------------------------------------------------------

class GroqLLMClient:
    """Groq via OpenAI-compatible API for llama models — fallback."""

    def __init__(self, api_key: str) -> None:
        self._client = AsyncOpenAI(
            api_key=api_key,
            base_url=settings.LLM_BASE_URL,
        )

    async def stream_with_tools(
        self,
        system: str,
        messages: list[dict],
        tools: list[dict] | None = None,  # noqa: ARG002 — kept for interface parity
        model: str = "llama-3.3-70b-versatile",
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> AsyncGenerator[StreamEvent, None]:
        """Non-streaming fallback that yields a single TextDelta + MessageComplete."""
        openai_messages = [{"role": "system", "content": system}, *messages]
        response = await self._client.chat.completions.create(
            model=model,
            messages=openai_messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        text = response.choices[0].message.content or ""
        yield TextDelta(text=text)

        input_tokens = getattr(response.usage, "prompt_tokens", 0)
        output_tokens = getattr(response.usage, "completion_tokens", 0)
        yield UsageUpdate(input_tokens=input_tokens, output_tokens=output_tokens)
        yield MessageComplete(stop_reason="end_turn")

    async def chat(
        self,
        messages: list[dict],
        system: str = "",
        model: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> str:
        """Simple chat completion via Groq."""
        openai_messages = []
        if system:
            openai_messages.append({"role": "system", "content": system})
        openai_messages.extend(messages)
        response = await self._client.chat.completions.create(
            model=model or settings.LLM_MODEL,
            messages=openai_messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return response.choices[0].message.content or ""


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def get_llm_client(model: str | None = None) -> AnthropicLLMClient | GroqLLMClient:
    """Return the appropriate LLM client based on the model name.

    Claude models -> AnthropicLLMClient (requires ANTHROPIC_API_KEY)
    Everything else -> GroqLLMClient (requires GROQ_API_KEY)
    """
    resolved_model = model or settings.DEFAULT_MODEL

    if resolved_model.startswith("claude") and settings.ANTHROPIC_API_KEY:
        return AnthropicLLMClient(settings.ANTHROPIC_API_KEY)
    if settings.GROQ_API_KEY:
        return GroqLLMClient(settings.GROQ_API_KEY)

    raise RuntimeError(
        "No LLM API key configured. Set ANTHROPIC_API_KEY or GROQ_API_KEY."
    )


def llm_available() -> bool:
    """Return True if at least one LLM backend is configured."""
    return bool(settings.ANTHROPIC_API_KEY or settings.GROQ_API_KEY)


# Backwards-compatible singleton (used by old invoke endpoint)
class _LegacyLLMService:
    @property
    def available(self) -> bool:
        return llm_available()

    @property
    def client(self):
        if settings.GROQ_API_KEY:
            return AsyncOpenAI(
                api_key=settings.GROQ_API_KEY,
                base_url=settings.LLM_BASE_URL,
            )
        return None

    async def chat(
        self,
        messages: list[dict],
        model: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> str:
        if not self.available:
            return "LLM not configured. Set ANTHROPIC_API_KEY or GROQ_API_KEY."
        client = get_llm_client(model)
        return await client.chat(messages=messages, model=model or settings.LLM_MODEL, max_tokens=max_tokens, temperature=temperature)


llm_service = _LegacyLLMService()
