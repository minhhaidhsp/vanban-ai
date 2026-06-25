# CLAUDE.md — VănBản.AI (CivicAI) Project Guide

> File này được Claude Code tự động đọc khi mở dự án.
> Chứa mọi thứ cần biết để làm việc hiệu quả với codebase này.

## Dự án là gì?

**CivicAI** — ứng dụng web hỗ trợ cán bộ hành chính công Việt Nam soạn thảo, quản lý và tra cứu văn bản theo **Nghị định 30/2020/NĐ-CP**.

- **Frontend:** Next.js 14 + TipTap editor (soạn thảo A4 NĐ30) — `D:\Projects\vanban-ai\frontend\`
- **Backend:** FastAPI + PostgreSQL + pgvector — `D:\Projects\vanban-ai\backend\`
- **AI/RAG:** BAAI/bge-m3 embedding + Groq llama-3.3-70b + CrossEncoder rerank
- **Deploy:** Railway (backend port 8080) + Vercel (frontend)
- **Branch làm việc:** `dev` → merge vào `main` để Railway auto-deploy

## Quy tắc tuyệt đối

1. **KHÔNG commit/push** khi chưa được user xác nhận rõ ràng
2. **KHÔNG push lên `main`** — chỉ push `dev`, user quyết định merge
3. **Sau khi merge main:** luôn `git checkout dev`
4. **Build check** trước khi báo cáo: `cd frontend && npx next build`
5. **Đọc code trước khi sửa** — Grep/Read để xác nhận đúng vị trí

## Môi trường local

| Service | URL/Connection |
|---|---|
| Backend | `http://localhost:8000` |
| Frontend (dev) | `http://localhost:3000` |
| PostgreSQL | `host=localhost port=5433 user=postgres password=postgres123 dbname=vanban_ai` |
| Python venv | `backend\venv\Scripts\python.exe` |

## Tài khoản demo

| Email | Password | Role |
|---|---|---|
| `demo@civicai.vn` | `Demo@2026` | staff |
| `canbo@civicai.vn` | `Demo@2026` | staff |
| `quantri@civicai.vn` | `Demo@2026` | admin |

## Cách debug thường dùng

```powershell
# DB query
$env:PGPASSWORD='postgres123'
& 'C:\Program Files\PostgreSQL\16\bin\psql.exe' -h localhost -p 5433 -U postgres -d vanban_ai -c "SELECT ..."

# Test backend API
$token = ((Invoke-WebRequest -Uri "http://localhost:8000/api/v1/auth/login" -Method POST -ContentType "application/x-www-form-urlencoded" -Body "username=canbo%40civicai.vn&password=Demo%402026").Content | ConvertFrom-Json).access_token

# Test service trực tiếp (venv)
cd backend
venv\Scripts\python.exe -c "
import asyncio, sys; sys.path.insert(0, '.')
from app.services.pipeline_service import _extract_docx
# ... test code
"

# Build frontend
cd frontend
$env:NEXT_PUBLIC_API_URL = 'http://localhost:8000'
& 'C:\Program Files\nodejs\npx.cmd' next build
```

## Lỗi thường gặp

| Lỗi | Fix |
|---|---|
| Dev server `Cannot find module './682.js'` | `rm -rf .next && npm run dev` (stale chunk) |
| `Database error: Executor shutdown` | Restart backend |
| `embedding model not ready` | Đợi 60-120s sau startup (BAAI/bge-m3 lazy load) |
| Port 3008 CORS error | Test với dev server port 3000 (allowed_origins chỉ có 3000) |
| `next build` NEXT_PUBLIC_API_URL sai | Set `$env:NEXT_PUBLIC_API_URL = 'http://localhost:8000'` trước build |
| `editor.can() on null/destroyed` | Editor bị destroy khi đổi loại VB → đã fix `isDestroyed` guard |
| Export PDF vẫn hiện NĐ30 template cho trang trắng | PDF dùng Puppeteer → `/print/[id]` → `DocumentPreview.tsx` (không phải `pdf_service.py`) |
| Upload file .doc → lỗi không rõ | Chỉ hỗ trợ `.pdf .docx .jpg .jpeg .png` — `.doc` bị loại khỏi accept |

## File quan trọng nhất

```
frontend/
  app/
    page.tsx                # Landing page CivicAI (server component)
    print/[id]/
      DocumentPreview.tsx   # ← PDF dùng Puppeteer render component NÀY (không phải pdf_service)
      page.tsx              # Server component fetch doc → PrintPreview
    api/export/pdf/route.ts # Puppeteer launch → GET /print/{id} → PDF
    dashboard/tools/
      reminders/page.tsx    # Tool: Nhắc hẹn
      speech-to-text/page.tsx  # Tool: Chuyển âm thanh thành văn bản
  components/editor/
    document-editor.tsx    # Wrapper chính, quản lý state editor
    nd30-document.tsx      # Form A4 NĐ30, toolbar, ruler
    WelcomePanel.tsx       # Màn hình chào khi tạo văn bản mới
    extensions.ts          # TipTap extensions registry
    SourcesPanel.tsx       # Cột trái editor: upload, search, rename/delete dropdown
  components/tools/
    reminders/             # ReminderForm, ReminderList, EmailRecipientsInput
    stt/                   # AudioRecorder, LanguageSelector, TranscriptEditor
  lib/
    api.ts                 # Tất cả API calls chính
    api/reminders.ts       # Reminders API client
    api/stt.ts             # Speech-to-Text API client
  app/globals.css          # CSS: ProseMirror table, nd30-preview table

backend/
  app/services/
    rag_service.py          # RAG pipeline: retrieve/rerank/generate + retrieve_qa()
    pdf_service.py          # Export PDF (xhtml2pdf); blank mode chỉ render noiDung
    docx_service.py         # Export DOCX (python-docx + lxml); _process_block() table
    pipeline_service.py     # Embedding + _extract_docx() HTML + _extract_pdf() table
    embedding_service.py    # BAAI/bge-m3 singleton
    email_service.py        # Gửi email qua SendGrid với file .ics đính kèm
    ics_service.py          # Generate RFC 5545 .ics (VALARM -PT30M)
    stt_service.py          # Groq Whisper API (httpx async, timeout 60s)
  app/api/v1/endpoints/
    documents.py            # CRUD + _doc_access() admin bypass
    rag.py                  # RAG chat/stream endpoints
    reference_docs.py       # Upload/search reference docs
    reminders.py            # Reminders CRUD + /users/search + /resend
    stt.py                  # /transcribe, /transcribe-realtime, /languages
  app/models/
    reminder.py             # Model bảng reminders (migration 0020)
  alembic/versions/
    0020_create_reminders_table.py
    0021_add_recipients_to_reminders.py
```

## Workflow thực hiện task

```
1. User gửi prompt (thường theo format ══════ PROMPT ══════)
2. AI: đọc code liên quan (Grep/Read) → xác nhận context
3. AI: sửa code (Edit) → chạy build/test → báo cáo kết quả
4. User: review → "OK commit" hoặc yêu cầu sửa
5. AI: commit -m "feat/fix: mô tả ngắn" → git push dev
6. User: quyết định merge main + Railway deploy
```

## Tài liệu đầy đủ

Xem `docs/TECHNICAL.md` — đặc biệt **Section 0** (Hướng dẫn onboarding) để hiểu toàn bộ context.
