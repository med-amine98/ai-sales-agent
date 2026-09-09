from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
import os
from dotenv import load_dotenv

from sqlalchemy import event
from sqlalchemy.engine import Engine

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./sales_agent.db")

# Optimisation du moteur SQLite pour de hautes performances
engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Désactiver pour améliorer la performance
    future=True,
    connect_args={
        "check_same_thread": False,
        "timeout": 30
    } if "sqlite" in DATABASE_URL else {}
)

# Configuration des PRAGMA SQLite pour la rapidité et la concurrence (WAL)
if "sqlite" in DATABASE_URL:
    # Appliquer les événements sur le moteur synchrone sous-jacent
    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        # Existing pragma settings
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA cache_size=-64000")
        cursor.execute("PRAGMA busy_timeout=5000")
        # Ensure conversations table has call_id column
        cursor.execute("PRAGMA table_info(conversations)")
        columns = [row[1] for row in cursor.fetchall()]
        if "call_id" not in columns:
            cursor.execute("ALTER TABLE conversations ADD COLUMN call_id INTEGER REFERENCES calls(id)")
        cursor.close()

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()