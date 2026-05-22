import asyncio
import asyncpg

async def check():
    conn = await asyncpg.connect("postgresql://postgres:postgres123@localhost:5432/vanban_ai")

    tables = await conn.fetch(
        "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'reference%'"
    )
    print("Tables:", [r["tablename"] for r in tables])

    count = await conn.fetchval("SELECT COUNT(*) FROM reference_documents")
    print("Row count:", count)

    ver = await conn.fetchval("SELECT version_num FROM alembic_version")
    print("Alembic version:", ver)

    cols = await conn.fetch("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'reference_documents'
        ORDER BY ordinal_position
    """)
    print("Columns:")
    for c in cols:
        print(f"  {c['column_name']:25} {c['data_type']:20} nullable={c['is_nullable']} default={c['column_default']}")

    await conn.close()

asyncio.run(check())
