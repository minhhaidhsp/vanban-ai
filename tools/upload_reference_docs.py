# -*- coding: utf-8 -*-
"""
Script upload hang loat PDF len production /dashboard/reference-docs
Chay tren Windows local.

Usage:
    python upload_reference_docs.py

Yeu cau:
    pip install requests tqdm
"""
import os
import sys
import json
import time
import requests
from pathlib import Path
from tqdm import tqdm
from datetime import datetime

# ============================================================
# CAU HINH — sua cho dung
# ============================================================
PDF_DIR      = Path(r"G:\My Drive\NCKH\Đề tài NCKH\Cấp Sở\Sở KHCN TP. HCM\KIOS\Tài liệu - thủ tục_Xa Ban Co\ALL\PDF")
API_BASE_URL = "https://vanban-ai-production.up.railway.app/api/v1"
EMAIL        = "minhhaidhsp@gmail.com"
PASSWORD     = "12345678"
BATCH_SIZE   = 10   # so file moi batch (< upload_max_files=20)
DELAY_BATCH  = 3    # giay cho giua cac batch
DELAY_FILE   = 0.5  # giay cho giua cac file trong batch
REPORT_DIR   = Path(r"G:\My Drive\vanban-ai-dataset\reports")
# ============================================================

REPORT_DIR.mkdir(parents=True, exist_ok=True)
SESSION = requests.Session()
SESSION.headers.update({"Accept": "application/json"})

# ============================================================
# AUTH
# ============================================================
def login():
    """Login va lay JWT token."""
    r = SESSION.post(
        f"{API_BASE_URL}/auth/login",
        data={"username": EMAIL, "password": PASSWORD},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=30,
    )
    r.raise_for_status()
    token = r.json()["access_token"]
    SESSION.headers.update({"Authorization": f"Bearer {token}"})
    print(f"Login OK: {EMAIL}")
    return token

# ============================================================
# UPLOAD
# ============================================================
def create_reference_doc(filename):
    """Tao reference doc truoc khi upload file."""
    title = Path(filename).stem[:200]
    r = SESSION.post(
        f"{API_BASE_URL}/reference-docs/",
        json={
            "title": title,
            "description": f"Auto-uploaded: {filename}",
            "visibility": "private",
        },
        timeout=30,
    )
    r.raise_for_status()
    return r.json()["id"]

def upload_single(pdf_path, doc_id):
    """Upload 1 file PDF len reference doc."""
    with open(pdf_path, "rb") as f:
        r = SESSION.post(
            f"{API_BASE_URL}/reference-docs/{doc_id}/upload",
            files={"file": (pdf_path.name, f, "application/pdf")},
            timeout=300,
        )
    r.raise_for_status()
    return r.json()

def upload_batch(pdf_paths):
    """Upload batch nhieu file cung luc."""
    files = []
    handles = []
    try:
        for pdf_path in pdf_paths:
            f = open(pdf_path, "rb")
            handles.append(f)
            files.append(("files", (pdf_path.name, f, "application/pdf")))

        r = SESSION.post(
            f"{API_BASE_URL}/reference-docs/upload-batch",
            files=files,
            data={"visibility": "private"},
            timeout=300,
        )
        r.raise_for_status()
        return r.json()
    finally:
        for f in handles:
            f.close()

def poll_job(job_id, max_wait=300):
    """Poll trang thai job cho den khi xong."""
    for _ in range(max_wait):
        try:
            r = SESSION.get(
                f"{API_BASE_URL}/reference-docs/status/{job_id}",
                timeout=30,
            )
            if r.status_code == 200:
                data = r.json()
                status = data.get("status", "")
                if status in ("completed", "done", "success"):
                    return "done", data
                elif status in ("failed", "error"):
                    return "failed", data
        except Exception:
            pass
        time.sleep(2)
    return "timeout", {}

# ============================================================
# MAIN
# ============================================================
def main():
    start_time = datetime.now()
    print("UPLOAD REFERENCE DOCS — Production")
    print("=" * 60)
    print(f"PDF dir : {PDF_DIR}")
    print(f"API     : {API_BASE_URL}")
    print(f"Bat dau : {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    # Kiem tra thu muc
    if not PDF_DIR.exists():
        print(f"KHONG TIM THAY: {PDF_DIR}")
        sys.exit(1)

    # Scan PDF
    all_pdfs = list(PDF_DIR.rglob("*.pdf")) + list(PDF_DIR.rglob("*.PDF"))
    print(f"Tong PDF: {len(all_pdfs)}")

    # Load trang thai da upload (resume support)
    done_file = REPORT_DIR / "upload_done.json"
    done_ids = set()
    if done_file.exists():
        with open(done_file, "r", encoding="utf-8") as f:
            done_ids = set(json.load(f))
        print(f"Da upload truoc: {len(done_ids)} files")

    # Loc cac file chua upload
    pending = [p for p in all_pdfs if str(p) not in done_ids]
    print(f"Can upload: {len(pending)} files")
    print()

    if not pending:
        print("Tat ca da upload!")
        return

    # Login
    try:
        login()
    except Exception as e:
        print(f"Login FAIL: {e}")
        print("Kiem tra EMAIL va PASSWORD trong script!")
        sys.exit(1)

    # Upload theo batch
    results = {"success": [], "failed": [], "skip": []}
    total_batches = (len(pending) + BATCH_SIZE - 1) // BATCH_SIZE

    print(f"Upload {len(pending)} files theo batch {BATCH_SIZE}...")
    print("=" * 60)

    for batch_idx in range(total_batches):
        batch = pending[batch_idx * BATCH_SIZE : (batch_idx + 1) * BATCH_SIZE]
        print(f"\nBatch {batch_idx + 1}/{total_batches} ({len(batch)} files):")

        # Thu upload batch truoc
        try:
            resp = upload_batch(batch)
            jobs = resp.get("jobs", [])

            # Poll tung job
            for job_info in tqdm(jobs, desc="  Polling", leave=False):
                job_id = job_info.get("job_id")
                filename = job_info.get("filename", "unknown")
                if not job_id:
                    continue

                status, data = poll_job(job_id)
                pdf_path = next((p for p in batch if p.name == filename), None)

                if status == "done":
                    results["success"].append({
                        "file": filename,
                        "job_id": job_id,
                        "path": str(pdf_path),
                    })
                    if pdf_path:
                        done_ids.add(str(pdf_path))
                    print(f"  OK: {filename[:60]}")
                else:
                    results["failed"].append({
                        "file": filename,
                        "job_id": job_id,
                        "status": status,
                        "error": str(data),
                    })
                    print(f"  FAIL ({status}): {filename[:60]}")

        except Exception as e:
            print(f"  Batch fail: {e}")
            print("  Thu upload tung file...")

            # Fallback: upload tung file
            for pdf_path in tqdm(batch, desc="  Single upload", leave=False):
                try:
                    doc_id = create_reference_doc(pdf_path.name)
                    time.sleep(0.5)
                    upload_single(pdf_path, doc_id)
                    results["success"].append({
                        "file": pdf_path.name,
                        "path": str(pdf_path),
                    })
                    done_ids.add(str(pdf_path))
                    print(f"  OK: {pdf_path.name[:60]}")
                except Exception as e2:
                    results["failed"].append({
                        "file": pdf_path.name,
                        "path": str(pdf_path),
                        "error": str(e2),
                    })
                    print(f"  FAIL: {pdf_path.name[:60]}: {str(e2)[:60]}")
                time.sleep(DELAY_FILE)

        # Luu trang thai sau moi batch (resume support)
        with open(done_file, "w", encoding="utf-8") as f:
            json.dump(list(done_ids), f, ensure_ascii=False)

        # Re-login moi 5 batch de tranh token het han
        if (batch_idx + 1) % 5 == 0:
            try:
                login()
                print("  Token refreshed")
            except Exception:
                pass

        time.sleep(DELAY_BATCH)

    # --------------------------------------------------------
    # BAO CAO
    # --------------------------------------------------------
    end_time = datetime.now()
    duration = (end_time - start_time).seconds

    print()
    print("=" * 60)
    print("BAO CAO KET QUA UPLOAD")
    print("=" * 60)
    print(f"Thoi gian  : {duration // 60}m {duration % 60}s")
    print(f"Tong xu ly : {len(pending)} files")
    print(f"  OK       : {len(results['success'])}")
    print(f"  FAIL     : {len(results['failed'])}")

    if results["failed"]:
        print(f"\nFILES THAT BAI ({len(results['failed'])}):")
        for r in results["failed"][:20]:
            print(f"  - {r['file'][:60]}: {r.get('error','')[:60]}")
        if len(results["failed"]) > 20:
            print(f"  ... va {len(results['failed']) - 20} files khac")

    # Luu report
    report = {
        "run_time": start_time.isoformat(),
        "duration_seconds": duration,
        "total": len(pending),
        "success": len(results["success"]),
        "failed": len(results["failed"]),
        "details": results,
    }
    report_file = REPORT_DIR / f"upload_report_{start_time.strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"\nReport: {report_file}")
    print(f"Resume file: {done_file}")
    print("\nHOAN THANH!")


if __name__ == "__main__":
    main()
