"""LLM service with Gemini (free), Groq (cheap), and Anthropic (premium) providers.

Each client implements a unified interface:
  - stream_with_tools(): async generator yielding StreamEvent objects
  - chat(): simple non-streaming completion
  - PROVIDER: str class attribute for cost/logging
  - DEFAULT_MODEL: str class attribute for the default model
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any, AsyncGenerator, Union

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


StreamEvent = Union[TextDelta, ToolUseStart, ToolUseComplete, UsageUpdate, MessageComplete]


# ---------------------------------------------------------------------------
# Cost per-provider (USD per token)
# ---------------------------------------------------------------------------

PROVIDER_COSTS: dict[str, dict[str, float]] = {
    "gemini": {"input": 0.0, "output": 0.0},  # Free tier
    "groq": {"input": 0.00000059, "output": 0.00000079},
    "anthropic": {"input": 0.000003, "output": 0.000015},
}


def calculate_cost(provider: str, input_tokens: int, output_tokens: int) -> float:
    """Calculate cost in USD for a given provider and token counts."""
    rates = PROVIDER_COSTS.get(provider, PROVIDER_COSTS["anthropic"])
    return (input_tokens * rates["input"]) + (output_tokens * rates["output"])


# ---------------------------------------------------------------------------
# Google Gemini client — primary (free tier)
# ---------------------------------------------------------------------------

class GeminiLLMClient:
    """Google Gemini API with native function calling."""

    PROVIDER = "gemini"
    DEFAULT_MODEL = "gemini-2.5-flash"

    def __init__(self, api_key: str) -> None:
        from google import genai
        self._client = genai.Client(
            api_key=api_key,
            http_options={"timeout": 90_000},  # 90s HTTP timeout in milliseconds
        )
        self._genai_types = __import__("google.genai.types", fromlist=["types"])

    def _convert_tools_to_gemini(self, tools: list[dict] | None) -> list | None:
        """Convert Claude tool schemas to Gemini FunctionDeclaration format."""
        if not tools:
            return None

        types = self._genai_types
        declarations = []
        for tool in tools:
            declarations.append(types.FunctionDeclaration(
                name=tool["name"],
                description=tool.get("description", ""),
                parameters=tool.get("input_schema"),
            ))
        return [types.Tool(function_declarations=declarations)]

    def _convert_messages_to_gemini(
        self, messages: list[dict],
    ) -> list:
        """Convert Claude-format messages to Gemini contents format.

        Claude format:
          {"role": "user", "content": "text"} or {"role": "user", "content": [...]}
          {"role": "assistant", "content": "text"} or with tool_use blocks
          Tool results: {"role": "user", "content": [{"type": "tool_result", ...}]}

        Gemini format:
          {"role": "user", "parts": [types.Part(text="...")]}
          {"role": "model", "parts": [types.Part(text="...")]}
          Function calls: parts with function_call
          Function responses: parts with function_response
        """
        types = self._genai_types
        contents = []

        # Build tool_use_id → name mapping so tool_result blocks can resolve names
        # (Claude tool_result has tool_use_id but not name; Gemini FunctionResponse needs name)
        tool_id_to_name: dict[str, str] = {}

        for msg in messages:
            role = "model" if msg["role"] == "assistant" else "user"
            content = msg["content"]

            if isinstance(content, str):
                contents.append(types.Content(
                    role=role,
                    parts=[types.Part(text=content)],
                ))
                continue

            # Complex content blocks (list)
            parts = []
            for block in content:
                if isinstance(block, str):
                    parts.append(types.Part(text=block))
                elif isinstance(block, dict):
                    block_type = block.get("type", "")

                    if block_type == "text":
                        parts.append(types.Part(text=block["text"]))

                    elif block_type == "tool_use":
                        # Track id → name for tool_result resolution
                        block_id = block.get("id", "")
                        block_name = block["name"]
                        if block_id:
                            tool_id_to_name[block_id] = block_name
                        parts.append(types.Part(
                            function_call=types.FunctionCall(
                                name=block_name,
                                args=block.get("input", {}),
                            ),
                        ))

                    elif block_type == "tool_result":
                        result_content = block.get("content", "")
                        # Try to parse as JSON for structured output
                        try:
                            parsed = json.loads(result_content) if isinstance(result_content, str) else result_content
                        except (json.JSONDecodeError, TypeError):
                            parsed = {"result": result_content}
                        if not isinstance(parsed, dict):
                            parsed = {"result": parsed}

                        # Resolve name: prefer explicit name, fall back to id→name map
                        tool_use_id = block.get("tool_use_id", "")
                        fn_name = block.get("name") or tool_id_to_name.get(tool_use_id, "unknown")

                        parts.append(types.Part(
                            function_response=types.FunctionResponse(
                                name=fn_name,
                                response=parsed,
                            ),
                        ))

            if parts:
                contents.append(types.Content(role=role, parts=parts))

        return contents

    async def stream_with_tools(
        self,
        system: str,
        messages: list[dict],
        tools: list[dict] | None = None,
        model: str = "gemini-2.5-flash",
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> AsyncGenerator[StreamEvent, None]:
        """Stream a Gemini response, yielding StreamEvent objects."""
        types = self._genai_types

        gemini_tools = self._convert_tools_to_gemini(tools)
        gemini_contents = self._convert_messages_to_gemini(messages)

        config_kwargs: dict[str, Any] = {
            "system_instruction": system,
            "max_output_tokens": max_tokens,
            "temperature": temperature,
        }
        if gemini_tools:
            config_kwargs["tools"] = gemini_tools
        config = types.GenerateContentConfig(**config_kwargs)

        # Use streaming API for true token-by-token delivery
        tool_call_counter = 0
        tracked_input = 0
        tracked_output = 0

        async for chunk in await self._client.aio.models.generate_content_stream(
            model=model,
            contents=gemini_contents,
            config=config,
        ):
            # Track cumulative usage — Gemini emits running totals, not deltas
            usage_meta = getattr(chunk, "usage_metadata", None)
            if usage_meta:
                inp = getattr(usage_meta, "prompt_token_count", 0) or 0
                out = getattr(usage_meta, "candidates_token_count", 0) or 0
                if inp > tracked_input:
                    tracked_input = inp
                if out > tracked_output:
                    tracked_output = out

            if not chunk.candidates:
                continue

            candidate = chunk.candidates[0]
            if not candidate.content or not candidate.content.parts:
                continue

            for part in candidate.content.parts:
                # Skip Gemini 2.5 "thinking" parts (internal reasoning)
                if getattr(part, "thought", False):
                    continue

                fn_call = getattr(part, "function_call", None)
                if fn_call and fn_call.name:
                    # Generate unique IDs — Gemini FunctionCall has no .id field
                    tool_id = f"gemini_{fn_call.name}_{tool_call_counter}"
                    tool_call_counter += 1
                    yield ToolUseStart(tool_use_id=tool_id, name=fn_call.name)
                    yield ToolUseComplete(
                        tool_use_id=tool_id,
                        name=fn_call.name,
                        input=dict(fn_call.args) if fn_call.args else {},
                    )
                elif getattr(part, "text", None):
                    yield TextDelta(text=part.text)

        # Emit usage once after the loop — consistent with Groq/Anthropic pattern
        if tracked_input or tracked_output:
            yield UsageUpdate(input_tokens=tracked_input, output_tokens=tracked_output)

        stop_reason = "tool_use" if tool_call_counter > 0 else "end_turn"
        yield MessageComplete(stop_reason=stop_reason)

    async def chat(
        self,
        messages: list[dict],
        system: str = "",
        model: str = "gemini-2.5-flash",
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> str:
        """Simple non-streaming chat completion."""
        types = self._genai_types

        gemini_contents = self._convert_messages_to_gemini(messages)

        config = types.GenerateContentConfig(
            system_instruction=system if system else None,
            max_output_tokens=max_tokens,
            temperature=temperature,
        )

        response = await self._client.aio.models.generate_content(
            model=model,
            contents=gemini_contents,
            config=config,
        )

        if (
            response.candidates
            and response.candidates[0].content
            and response.candidates[0].content.parts
        ):
            return "".join(
                part.text for part in response.candidates[0].content.parts
                if getattr(part, "text", None)
            )
        return ""


# ---------------------------------------------------------------------------
# Anthropic (Claude) client — premium
# ---------------------------------------------------------------------------

class AnthropicLLMClient:
    """Claude API with native tool_use and streaming."""

    PROVIDER = "anthropic"
    DEFAULT_MODEL = "claude-sonnet-4-6"

    def __init__(self, api_key: str) -> None:
        from anthropic import AsyncAnthropic
        self._client = AsyncAnthropic(
            api_key=api_key,
            timeout=90.0,  # 90s HTTP timeout
        )

    async def stream_with_tools(
        self,
        system: str,
        messages: list[dict],
        tools: list[dict] | None = None,
        model: str = "claude-sonnet-4-6",
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> AsyncGenerator[StreamEvent, None]:
        """Stream a Claude response, yielding StreamEvent objects."""
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
                            input_tokens=getattr(usage, "input_tokens", 0) or 0,
                            output_tokens=getattr(usage, "output_tokens", 0) or 0,
                        )
                    yield MessageComplete(stop_reason=stop_reason)

                elif event_type == "message_start":
                    usage = getattr(event.message, "usage", None)
                    if usage:
                        yield UsageUpdate(
                            input_tokens=getattr(usage, "input_tokens", 0) or 0,
                            output_tokens=getattr(usage, "output_tokens", 0) or 0,
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
# Groq (OpenAI-compatible) client — fallback with tool calling
# ---------------------------------------------------------------------------

class GroqLLMClient:
    """Groq via OpenAI-compatible API for llama models — with tool calling."""

    PROVIDER = "groq"
    DEFAULT_MODEL = "llama-3.3-70b-versatile"

    def __init__(self, api_key: str) -> None:
        from openai import AsyncOpenAI
        self._client = AsyncOpenAI(
            api_key=api_key,
            base_url=settings.LLM_BASE_URL,
            timeout=90.0,  # 90s HTTP timeout
        )

    def _convert_tools_to_openai(self, tools: list[dict] | None) -> list[dict] | None:
        """Convert Claude tool schemas to OpenAI function calling format."""
        if not tools:
            return None
        return [
            {
                "type": "function",
                "function": {
                    "name": tool["name"],
                    "description": tool.get("description", ""),
                    "parameters": tool.get("input_schema", {}),
                },
            }
            for tool in tools
        ]

    def _convert_messages_to_openai(
        self, system: str, messages: list[dict],
    ) -> list[dict]:
        """Convert Claude-format messages to OpenAI format.

        Handles tool_use blocks (assistant) and tool_result blocks (user).
        """
        openai_messages: list[dict] = []
        if system:
            openai_messages.append({"role": "system", "content": system})

        for msg in messages:
            role = msg["role"]
            content = msg["content"]

            # Simple string content
            if isinstance(content, str):
                openai_messages.append({"role": role, "content": content})
                continue

            # Complex content blocks
            if not isinstance(content, list):
                openai_messages.append({"role": role, "content": str(content)})
                continue

            # Check if this is a tool_result list (from user role)
            if role == "user" and content and isinstance(content[0], dict) and content[0].get("type") == "tool_result":
                for block in content:
                    raw_content = block.get("content", "")
                    # OpenAI expects content as a string
                    if isinstance(raw_content, list):
                        raw_content = json.dumps(raw_content)
                    elif not isinstance(raw_content, str):
                        raw_content = str(raw_content)
                    openai_messages.append({
                        "role": "tool",
                        "tool_call_id": block.get("tool_use_id", ""),
                        "content": raw_content,
                    })
                continue

            # Assistant message with mixed text + tool_use blocks
            if role == "assistant":
                text_parts = []
                tool_calls = []
                for block in content:
                    if isinstance(block, dict):
                        if block.get("type") == "text":
                            text_parts.append(block["text"])
                        elif block.get("type") == "tool_use":
                            tool_calls.append({
                                "id": block.get("id", ""),
                                "type": "function",
                                "function": {
                                    "name": block["name"],
                                    "arguments": json.dumps(block.get("input", {})),
                                },
                            })

                assistant_msg: dict[str, Any] = {"role": "assistant"}
                if text_parts:
                    assistant_msg["content"] = "\n".join(text_parts)
                else:
                    assistant_msg["content"] = None
                if tool_calls:
                    assistant_msg["tool_calls"] = tool_calls
                openai_messages.append(assistant_msg)
                continue

            # Fallback: join text blocks
            text_parts = []
            for block in content:
                if isinstance(block, dict) and block.get("type") == "text":
                    text_parts.append(block["text"])
                elif isinstance(block, str):
                    text_parts.append(block)
            openai_messages.append({"role": role, "content": "\n".join(text_parts) or str(content)})

        return openai_messages

    async def stream_with_tools(
        self,
        system: str,
        messages: list[dict],
        tools: list[dict] | None = None,
        model: str = "llama-3.3-70b-versatile",
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> AsyncGenerator[StreamEvent, None]:
        """Groq streaming completion with tool calling support."""
        openai_messages = self._convert_messages_to_openai(system, messages)
        openai_tools = self._convert_tools_to_openai(tools)

        kwargs: dict[str, Any] = {
            "model": model,
            "messages": openai_messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": True,
            "stream_options": {"include_usage": True},
        }
        if openai_tools:
            kwargs["tools"] = openai_tools

        # Accumulate tool call deltas across chunks
        # tool_calls_acc: {index: {id, name, arguments}}
        tool_calls_acc: dict[int, dict[str, str]] = {}
        has_tool_calls = False
        usage_input = 0
        usage_output = 0

        async for chunk in await self._client.chat.completions.create(**kwargs):
            # Usage arrives in the final chunk
            if chunk.usage:
                usage_input = getattr(chunk.usage, "prompt_tokens", 0) or 0
                usage_output = getattr(chunk.usage, "completion_tokens", 0) or 0

            if not chunk.choices:
                continue

            delta = chunk.choices[0].delta

            # Stream text deltas
            if delta.content:
                yield TextDelta(text=delta.content)

            # Accumulate tool call deltas
            if delta.tool_calls:
                has_tool_calls = True
                for tc_delta in delta.tool_calls:
                    idx = tc_delta.index
                    if idx not in tool_calls_acc:
                        tool_calls_acc[idx] = {"id": "", "name": "", "arguments": ""}
                    if tc_delta.id:
                        tool_calls_acc[idx]["id"] = tc_delta.id
                    if tc_delta.function:
                        if tc_delta.function.name:
                            tool_calls_acc[idx]["name"] = tc_delta.function.name
                        if tc_delta.function.arguments:
                            tool_calls_acc[idx]["arguments"] += tc_delta.function.arguments

        # Emit fully assembled tool calls
        for idx in sorted(tool_calls_acc):
            tc = tool_calls_acc[idx]
            tool_id = tc["id"] or f"groq_{tc['name']}_{idx}"
            yield ToolUseStart(tool_use_id=tool_id, name=tc["name"])

            try:
                parsed_args = json.loads(tc["arguments"]) if tc["arguments"] else {}
            except json.JSONDecodeError:
                parsed_args = {}

            yield ToolUseComplete(tool_use_id=tool_id, name=tc["name"], input=parsed_args)

        # Emit usage
        if usage_input or usage_output:
            yield UsageUpdate(input_tokens=usage_input, output_tokens=usage_output)

        stop_reason = "tool_use" if has_tool_calls else "end_turn"
        yield MessageComplete(stop_reason=stop_reason)

    async def chat(
        self,
        messages: list[dict],
        system: str = "",
        model: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> str:
        """Simple chat completion via Groq."""
        openai_messages: list[dict] = []
        if system:
            openai_messages.append({"role": "system", "content": system})
        for msg in messages:
            content = msg["content"]
            if isinstance(content, str):
                openai_messages.append({"role": msg["role"], "content": content})
            elif isinstance(content, list):
                text = " ".join(
                    b.get("text", "") if isinstance(b, dict) else str(b)
                    for b in content
                )
                openai_messages.append({"role": msg["role"], "content": text})

        response = await self._client.chat.completions.create(
            model=model or settings.LLM_MODEL,
            messages=openai_messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return response.choices[0].message.content or ""


# ---------------------------------------------------------------------------
# Client type alias
# ---------------------------------------------------------------------------

LLMClient = Union[GeminiLLMClient, AnthropicLLMClient, GroqLLMClient]


# ---------------------------------------------------------------------------
# Factory — priority: Gemini (free) > Groq (cheap) > Claude (premium)
# ---------------------------------------------------------------------------

def get_llm_client(model: str | None = None) -> LLMClient:
    """Return the appropriate LLM client based on the model name.

    If a specific model is requested (e.g., "claude-sonnet-4-6"), use that provider.
    Otherwise, pick the cheapest available: Gemini > Groq > Claude.
    """
    resolved_model = model or settings.DEFAULT_MODEL

    # Explicit model selection
    if resolved_model.startswith("claude") and settings.ANTHROPIC_API_KEY:
        return AnthropicLLMClient(settings.ANTHROPIC_API_KEY)
    if resolved_model.startswith("gemini") and settings.GEMINI_API_KEY:
        return GeminiLLMClient(settings.GEMINI_API_KEY)
    if resolved_model.startswith("llama") and settings.GROQ_API_KEY:
        return GroqLLMClient(settings.GROQ_API_KEY)

    # Auto-select cheapest available
    if settings.GEMINI_API_KEY:
        return GeminiLLMClient(settings.GEMINI_API_KEY)
    if settings.GROQ_API_KEY:
        return GroqLLMClient(settings.GROQ_API_KEY)
    if settings.ANTHROPIC_API_KEY:
        return AnthropicLLMClient(settings.ANTHROPIC_API_KEY)

    raise RuntimeError(
        "No LLM API key configured. Set GEMINI_API_KEY (free), GROQ_API_KEY, or ANTHROPIC_API_KEY."
    )


def get_fallback_client(exclude_provider: str) -> LLMClient | None:
    """Return the next available LLM client, excluding the failed provider.

    Returns None if no fallback is available.
    """
    fallback_order: list[tuple[str, str | None, type]] = [
        ("gemini", settings.GEMINI_API_KEY, GeminiLLMClient),
        ("groq", settings.GROQ_API_KEY, GroqLLMClient),
        ("anthropic", settings.ANTHROPIC_API_KEY, AnthropicLLMClient),
    ]

    for provider_name, api_key, client_cls in fallback_order:
        if provider_name != exclude_provider and api_key:
            return client_cls(api_key)

    return None


def resolve_model_for_client(client: "LLMClient", requested_model: str | None) -> str:
    """Return a model name that is compatible with the given LLM client.

    If the requested model belongs to the client's provider, use it as-is.
    Otherwise, fall back to the client's DEFAULT_MODEL so that, e.g.,
    a GroqLLMClient never receives "gemini-2.5-flash".
    """
    if not requested_model:
        return client.DEFAULT_MODEL

    provider = client.PROVIDER  # "gemini" | "groq" | "anthropic"
    prefix_map = {"gemini": "gemini", "groq": "llama", "anthropic": "claude"}
    expected_prefix = prefix_map.get(provider, "")

    if requested_model.startswith(expected_prefix):
        return requested_model
    return client.DEFAULT_MODEL


def get_available_providers() -> list[dict[str, str]]:
    """Return list of configured LLM providers with their details."""
    providers = []
    if settings.GEMINI_API_KEY:
        providers.append({
            "provider": "gemini",
            "model": settings.GEMINI_MODEL,
            "tier": "free",
        })
    if settings.GROQ_API_KEY:
        providers.append({
            "provider": "groq",
            "model": settings.LLM_MODEL,
            "tier": "cheap",
        })
    if settings.ANTHROPIC_API_KEY:
        providers.append({
            "provider": "anthropic",
            "model": settings.DEFAULT_MODEL,
            "tier": "premium",
        })
    return providers


def llm_available() -> bool:
    """Return True if at least one LLM backend is configured."""
    return bool(settings.GEMINI_API_KEY or settings.ANTHROPIC_API_KEY or settings.GROQ_API_KEY)


def parse_llm_json(text: str) -> dict | None:
    """Strip markdown code fences and parse JSON from an LLM response."""
    import re
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*\n?", "", text)
    text = re.sub(r"\n?```$", "", text)
    text = text.strip()
    try:
        return json.loads(text)
    except (json.JSONDecodeError, ValueError):
        return None


# ---------------------------------------------------------------------------
# Backwards-compatible singleton (used by old invoke endpoint)
# ---------------------------------------------------------------------------

class _LegacyLLMService:
    @property
    def available(self) -> bool:
        return llm_available()

    @property
    def client(self):
        from openai import AsyncOpenAI
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
            return "LLM not configured. Set GEMINI_API_KEY, GROQ_API_KEY, or ANTHROPIC_API_KEY."
        client = get_llm_client(model)
        # Use the client's own default model — don't pass e.g. "llama-3.3-70b" to Gemini
        resolved_model = model or client.DEFAULT_MODEL
        return await client.chat(
            messages=messages,
            model=resolved_model,
            max_tokens=max_tokens,
            temperature=temperature,
        )


llm_service = _LegacyLLMService()
