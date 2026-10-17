"""Puter-only AI policy. Inference runs in the user's browser via Puter.js.

The API deliberately has no second provider implementation: handlers should return a
puter-client prompt handoff, and the frontend calls runPuter() with the selected model.
"""
from typing import Any
from ..core.config import settings

class PuterBrowserProvider:
    name = "AI"
    tier = "browser"
    model = settings.puter_model

async def server_provider_health(name: str) -> dict[str, Any]:
    if str(name or "").lower() != "puter":
        raise ValueError("This workspace only supports its configured AI service.")
    return {"id":"puter","name":"AI","tier":"browser","connected":None,"configured":True,"message":"AI availability is verified by a browser request.","models":[]}

def get_provider(name: str | None = None):
    if (name or "puter").lower() != "puter":
        raise ValueError("This workspace only supports its configured AI service.")
    return PuterBrowserProvider()

async def ask_selected(prompt: str, selected: str, model: str | None = None):
    if (selected or "puter").lower() != "puter":
        raise ValueError("This workspace only supports its configured AI service.")
    raise RuntimeError("AI runs in the browser. Return a browser prompt handoff instead of making a server inference call.")
