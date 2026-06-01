import itertools
import logging
import ssl
from urllib.parse import urlparse

from sqlalchemy.pool import NullPool
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

# Strip any ?ssl= or ?sslmode= query params — asyncpg ignores them and they cause parse errors
from urllib.parse import urlparse as _urlparse, urlencode, parse_qs, urlunparse
_p = _urlparse(database_url)
if _p.query:
    _qs = {k: v for k, v in parse_qs(_p.query).items()
           if k.lower() not in ("ssl", "sslmode", "sslrootcert", "sslcert", "sslkey")}
    database_url = urlunparse(_p._replace(query=urlencode(_qs, doseq=True)))

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
    # Generate globally-unique prepared statement names to avoid
    # DuplicatePreparedStatementError when Supabase internal pooler
    # fails to forward DEALLOCATE — names never repeat across connections.
    _stmt_counter = itertools.count()
    _connect_args: dict = {
        "ssl": _ssl_ctx,
        "statement_cache_size": 0,
        "prepared_statement_name_func": lambda: f"p{next(_stmt_counter)}",
    }
    logger.info("[db] SSL enabled (cert verify disabled) for remote host: %s", _parsed.hostname)
else:
    _connect_args = {}
    logger.info("[db] SSL disabled (local host)")

engine = create_async_engine(
    database_url,
    echo=settings.debug,
    poolclass=NullPool,
    connect_args=_connect_args,
).execution_options(compiled_cache=None)

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
