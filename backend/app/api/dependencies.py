"""Example protected routes that depend on authentication."""

from fastapi import APIRouter, Depends
from app.auth.dependencies import get_current_active_user
from app.auth.models import User
from app.auth.schemas import UserRead

router = APIRouter()


@router.get("/me", response_model=UserRead)
def read_me(current_user: User = Depends(get_current_active_user)) -> User:
    """Return the currently authenticated user."""
    return current_user
