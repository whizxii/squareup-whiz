"""LLM service using Groq via OpenAI-compatible API."""

from __future__ import annotations

from openai import AsyncOpenAI

from app.core.config import settings


class LLMService:
    """Async wrapper around the Groq (OpenAI-compatible) chat completions API."""

    def __init__(self) -> None:
        self._client: AsyncOpenAI | None = None

    @property
    def client(self) -> AsyncOpenAI | None:
        """Lazily initialise the client only when a valid API key is present."""
        if self._client is None and settings.GROQ_API_KEY:
            self._client = AsyncOpenAI(
                api_key=settings.GROQ_API_KEY,
                base_url=settings.LLM_BASE_URL,
            )
        return self._client

    @property
    def available(self) -> bool:
        """Return True when the LLM backend is configured."""
        return settings.GROQ_API_KEY is not None

    async def chat(
        self,
        messages: list[dict],
        model: str | None = None,
        max_tokens: int = 1024,
        temperature: float = 0.7,
    ) -> str:
        """Send a chat-completion request and return the assistant text.

        Returns a helpful fallback string when the service is not configured.
        """
        if not self.available:
            return "LLM not configured. Set GROQ_API_KEY in your .env file."

        response = await self.client.chat.completions.create(
            model=model or settings.LLM_MODEL,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return response.choices[0].message.content or ""


llm_service = LLMService()
