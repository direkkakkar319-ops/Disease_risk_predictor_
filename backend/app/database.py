from sqlalchemy import create_engine#CREATES A CONNECTION BETWEEN THE FASTAPI AND SQL ALCHEMY
from sqlalchemy.ext.declarative import declarative_base#CREATES A BASE CLASS FOR ALL MODELS
from sqlalchemy.orm import sessionmaker#CREATES A SESSION MAKER
from app.core.config import settings#IMPORTS THE SETTINGS FROM THE CONFIG FILE

engine = create_engine(
    settings.DATABASE_URL
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
