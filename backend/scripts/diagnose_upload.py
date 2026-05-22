"""Diagnose the upload flow: create record + upload file, check DB state at each step."""
import asyncio
import asyncpg
import httpx
import os

API = "http://localhost:8000/api/v1"


async def main():
    async with httpx.AsyncClient() as client:
        # Login
        r = await client.post(f"{API}/auth/login",
            data={"username": "minhhaidhsp@gmail.com", "password": "12345678"},
            headers={"Content-Type": "application/x-www-form-urlencoded"})
        token = r.json()["access_token"]
        auth = {"Authorization": f"Bearer {token}"}

        # Step 1: Create metadata record
        r = await client.post(f"{API}/reference-docs/", headers=auth, json={
            "title": "Diagnose test", "loai_van_ban": "Khac", "so_ki_hieu": "DIAG/2024",
            "co_quan_ban_hanh": "Test", "trich_yeu": "Diagnose test doc",
            "hieu_luc": "chua", "tu_khoa": []
        })
        print(f"Create status: {r.status_code}")
        if r.status_code != 201:
            print(f"Create FAILED: {r.text}")
            return
        doc_id = r.json()["id"]
        print(f"Created doc_id: {doc_id}")

        # Check DB immediately after create
        conn = await asyncpg.connect("postgresql://postgres:postgres123@localhost:5432/vanban_ai")
        row = await conn.fetchrow("SELECT id, file_path FROM reference_documents WHERE id=$1", doc_id)
        print(f"DB after create: {'FOUND' if row else 'NOT FOUND'} — file_path={row['file_path'] if row else 'N/A'}")

        # Step 2: Upload a small test file
        test_content = b"%PDF-1.4 fake pdf content for testing"
        r = await client.post(f"{API}/reference-docs/{doc_id}/upload", headers=auth,
            files={"file": ("test.pdf", test_content, "application/pdf")})
        print(f"Upload status: {r.status_code}")
        if r.status_code != 200:
            print(f"Upload FAILED: {r.text}")
        else:
            fp = r.json().get("file_path")
            print(f"Upload returned file_path: {fp}")

        # Check DB after upload
        row = await conn.fetchrow("SELECT id, file_path, file_size FROM reference_documents WHERE id=$1", doc_id)
        print(f"DB after upload: {'FOUND' if row else 'NOT FOUND'} — file_path={row['file_path'] if row else 'N/A'}")

        # Check total count
        count = await conn.fetchval("SELECT COUNT(*) FROM reference_documents")
        print(f"Total rows in DB: {count}")
        await conn.close()

        # Cleanup
        await client.delete(f"{API}/reference-docs/{doc_id}", headers=auth)
        print(f"Cleaned up doc {doc_id}")


asyncio.run(main())
