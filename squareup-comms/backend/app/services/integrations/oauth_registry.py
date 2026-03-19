"""Multi-provider OAuth registry — extends the existing Google OAuth pattern.

Each provider has its own auth/token URLs, scopes, and client credentials.
Reuses the existing IntegrationConfig model + Fernet encryption for token storage.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.core.config import settings


@dataclass(frozen=True)
class OAuthProviderConfig:
    """Configuration for a single OAuth2 provider."""

    name: str
    auth_url: str
    token_url: str
    scopes: dict[str, str] = field(default_factory=dict)
    client_id_setting: str = ""
    client_secret_setting: str = ""

    @property
    def client_id(self) -> str:
        return getattr(settings, self.client_id_setting, "") or ""

    @property
    def client_secret(self) -> str:
        return getattr(settings, self.client_secret_setting, "") or ""

    @property
    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret)


# ---------------------------------------------------------------------------
# Provider definitions
# ---------------------------------------------------------------------------

OAUTH_PROVIDERS: dict[str, OAuthProviderConfig] = {
    "google": OAuthProviderConfig(
        name="google",
        auth_url="https://accounts.google.com/o/oauth2/auth",
        token_url="https://oauth2.googleapis.com/token",
        scopes={
            "calendar": "https://www.googleapis.com/auth/calendar",
            "gmail": (
                "https://www.googleapis.com/auth/gmail.readonly "
                "https://www.googleapis.com/auth/gmail.send"
            ),
            "drive": "https://www.googleapis.com/auth/drive.readonly",
        },
        client_id_setting="GOOGLE_CLIENT_ID",
        client_secret_setting="GOOGLE_CLIENT_SECRET",
    ),
    "microsoft": OAuthProviderConfig(
        name="microsoft",
        auth_url="https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        token_url="https://login.microsoftonline.com/common/oauth2/v2.0/token",
        scopes={
            "calendar": "Calendars.ReadWrite",
            "email": "Mail.ReadWrite",
        },
        client_id_setting="MICROSOFT_CLIENT_ID",
        client_secret_setting="MICROSOFT_CLIENT_SECRET",
    ),
    "slack": OAuthProviderConfig(
        name="slack",
        auth_url="https://slack.com/oauth/v2/authorize",
        token_url="https://slack.com/api/oauth.v2.access",
        scopes={
            "messages": "channels:read,chat:write",
        },
        client_id_setting="SLACK_CLIENT_ID",
        client_secret_setting="SLACK_CLIENT_SECRET",
    ),
    "github": OAuthProviderConfig(
        name="github",
        auth_url="https://github.com/login/oauth/authorize",
        token_url="https://github.com/login/oauth/access_token",
        scopes={
            "repos": "repo",
            "issues": "repo",
        },
        client_id_setting="GITHUB_CLIENT_ID",
        client_secret_setting="GITHUB_CLIENT_SECRET",
    ),
}


def get_provider(name: str) -> OAuthProviderConfig | None:
    """Look up a provider by name."""
    return OAUTH_PROVIDERS.get(name)


def list_providers() -> list[dict]:
    """Return a serializable list of all providers with configuration status."""
    return [
        {
            "name": p.name,
            "auth_url": p.auth_url,
            "scopes": p.scopes,
            "is_configured": p.is_configured,
        }
        for p in OAUTH_PROVIDERS.values()
    ]
