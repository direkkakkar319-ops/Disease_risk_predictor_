"""Tests for the authentication flow using an in-memory database."""

import os
from datetime import timedelta

os.environ["SECRET_KEY"] = "test-secret-key-min-32-characters"
os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "30"
os.environ["REFRESH_TOKEN_EXPIRE_DAYS"] = "7"
os.environ["PASSLIB_BCRYPT_BACKEND"] = "builtin"

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.database import Base, get_db
from app.auth import router as auth_router
from app.auth.dependencies import get_current_active_user
from app.auth.security import create_access_token

SQLALCHEMY_DATABASE_URL = "sqlite+pysqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Provide a temporary database session for tests."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app = FastAPI()
app.include_router(auth_router)


@app.get("/me")
def read_me(current_user=Depends(get_current_active_user)):
    """Protected route used by the tests."""
    return current_user


Base.metadata.create_all(bind=engine)
app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


def test_auth_flow():
    """Register, login, and verify protected access."""
    register_response = client.post(
        "/auth/register",
        json={"username": "alice", "email": "alice@example.com", "password": "secret"},
    )
    assert register_response.status_code == 201

    login_response = client.post("/auth/login", data={"username": "alice", "password": "secret"})
    assert login_response.status_code == 200
    token_data = login_response.json()
    access_token = token_data["access_token"]

    me_response = client.get("/me", headers={"Authorization": f"Bearer {access_token}"})
    assert me_response.status_code == 200

    invalid_response = client.get("/me", headers={"Authorization": "Bearer invalid"})
    assert invalid_response.status_code == 401

    expired_token = create_access_token({"sub": "alice"}, expires_delta=timedelta(minutes=-1))
    expired_response = client.get("/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert expired_response.status_code == 401
