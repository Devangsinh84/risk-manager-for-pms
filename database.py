from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# This will create a local file called enterprise_risk.db
SQLALCHEMY_DATABASE_URL = "sqlite:///./enterprise_risk.db"

# connect_args={"check_same_thread": False} is strictly for SQLite in FastAPI
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency to inject the DB session into our FastAPI routes later
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()