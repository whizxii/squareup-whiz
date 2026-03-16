"""Pixel-art avatar options for SquareUp Comms onboarding."""

from __future__ import annotations

from typing_extensions import TypedDict


class AvatarOption(TypedDict):
    id: str
    name: str
    theme: str
    primary_color: str
    secondary_color: str
    icon: str


AVATAR_OPTIONS: list[AvatarOption] = [
    {
        "id": "fox",
        "name": "Fox",
        "theme": "Clever & swift",
        "primary_color": "#FF6B00",
        "secondary_color": "#FFD700",
        "icon": "\U0001F98A",
    },
    {
        "id": "cat",
        "name": "Cat",
        "theme": "Independent & curious",
        "primary_color": "#8B5CF6",
        "secondary_color": "#D8B4FE",
        "icon": "\U0001F431",
    },
    {
        "id": "bear",
        "name": "Bear",
        "theme": "Strong & reliable",
        "primary_color": "#92400E",
        "secondary_color": "#FCD34D",
        "icon": "\U0001F43B",
    },
    {
        "id": "robot",
        "name": "Robot",
        "theme": "Precise & tireless",
        "primary_color": "#3B82F6",
        "secondary_color": "#93C5FD",
        "icon": "\U0001F916",
    },
    {
        "id": "alien",
        "name": "Alien",
        "theme": "Creative & unique",
        "primary_color": "#10B981",
        "secondary_color": "#6EE7B7",
        "icon": "\U0001F47E",
    },
]

AVATAR_IDS = {a["id"] for a in AVATAR_OPTIONS}
