import asyncio
import os
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import all models so Alembic can detect them
from app.core.database import Base  # noqa
from app.models import *  # noqa
from app.models.ocr_job import OcrJob  # noqa: F401

target_metadata = Base.metadata


def get_url():
    from app.core.config import get_settings
    settings = get_settings()
    return settings.database_url.replace("postgresql://", "postgresql+asyncpg://", 1)


def run_migrations_offline() -> None:
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    import ssl
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_url()

    url = get_url()
    from urllib.parse import urlparse
    hostname = urlparse(url).hostname or ""
    is_remote = hostname not in ("localhost", "127.0.0.1", "::1", "")
    if is_remote:
        _ssl_ctx = ssl.create_default_context()
        _ssl_ctx.check_hostname = False
        _ssl_ctx.verify_mode = ssl.CERT_NONE
        _ca = {"ssl": _ssl_ctx, "statement_cache_size": 0, "server_settings": {"application_name": "vanban-ai"}}
    else:
        _ca = {}

    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args=_ca,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


# Migrations are disabled by default to prevent startup timeouts on Railway.
# To run migrations manually: railway run alembic upgrade head
# To enable automatic migrations on startup, set RUN_MIGRATIONS=true.
if os.getenv("RUN_MIGRATIONS", "false").lower() == "true":
    if context.is_offline_mode():
        run_migrations_offline()
    else:
        run_migrations_online()
