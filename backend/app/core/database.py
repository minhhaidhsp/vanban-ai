import logging
import ssl
from urllib.parse import urlparse

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# Normalize driver prefix to asyncpg
database_url = settings.database_url
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
# postgresql+asyncpg:// already correct — no change needed

# Log masked URL at startup so we can confirm env var is loaded
_parsed = urlparse(database_url)
_masked = database_url.replace(_parsed.password or "", "****") if _parsed.password else database_url
logger.info("[db] connecting to: %s", _masked)

# asyncpg requires ssl via connect_args — not via URL query string (?ssl=require fails)
_is_remote = (_parsed.hostname or "") not in ("localhost", "127.0.0.1", "::1", "")
if _is_remote:
    _ssl_ctx = ssl.create_default_context()
    _ssl_ctx.check_hostname = False
    _ssl_ctx.verify_mode = ssl.CERT_NONE
    _connect_args: dict = {"ssl": _ssl_ctx}
    logger.info("[db] SSL enabled (cert verify disabled) for remote host: %s", _parsed.hostname)
else:
    _connect_args = {}
    logger.info("[db] SSL disabled (local host)")

engine = create_async_engine(
    database_url,
    echo=settings.debug,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    connect_args=_connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
