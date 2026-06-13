import asyncpg, asyncio

async def check():
    c = await asyncpg.connect("postgresql://postgres:postgres123@localhost:5433/vanban_ai")
    avail = await c.fetch("SELECT name, default_version FROM pg_available_extensions WHERE name='vector'")
    print("available:", avail)
    installed = await c.fetch("SELECT extname, extversion FROM pg_extension WHERE extname='vector'")
    print("installed:", installed)
    await c.close()

asyncio.run(check())
