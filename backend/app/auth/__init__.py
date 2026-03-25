"""Auth package public entrypoints."""

from typing import Any

__all__ = ["router", "get_current_active_user"]


def __getattr__(name: str) -> Any:
    """Lazy-import auth helpers to avoid side effects during tooling runs."""
    if name == "router":
        from app.auth.router import router
        return router
    if name == "get_current_active_user":
        from app.auth.dependencies import get_current_active_user
        return get_current_active_user
    raise AttributeError(name)
