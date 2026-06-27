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
4. **Build check** trước khi báo cáo: `cd frontend && npm run build` (KHÔNG dùng `npx next build` — lỗi cache)
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
| `cho_bo_sung` không có `ly_do_bo_sung` → 422 | PATCH `/ho-so/{id}` yêu cầu `ly_do_bo_sung` khi đổi sang `cho_bo_sung` |
| Hoàn thành bước sau khi `hoan_thanh` → 409 | State machine chặn: không update bước sau khi hồ sơ đã hoàn thành |
| Pytest backend: `asyncio.run()` hai lần → EventLoop closed | Gộp thành `asyncio.run(_main())` duy nhất thay vì 2 lần `asyncio.run()` |
| `Database error: Executor shutdown` | Restart backend |
| `embedding model not ready` | Đợi 60-120s sau startup (BAAI/bge-m3 lazy load) |
| Port 3008 CORS error | Test với dev server port 3000 (allowed_origins chỉ có 3000) |
| `next build` NEXT_PUBLIC_API_URL sai | Set `$env:NEXT_PUBLIC_API_URL = 'http://localhost:8000'` trước build |
| `editor.can() on null/destroyed` | Editor bị destroy khi đổi loại VB → đã fix `isDestroyed` guard |
| Export PDF vẫn hiện NĐ30 template cho trang trắng | PDF dùng Puppeteer → `/print/[id]` → `DocumentPreview.tsx` (không phải `pdf_service.py`) |
| Upload file .doc → lỗi không rõ | Chỉ hỗ trợ `.pdf .docx .jpg .jpeg .png` — `.doc` bị loại khỏi accept |
| `next build` lỗi `PageNotFoundError: /_document` | Xóa cả `.next` và `node_modules/.cache`, dùng `npm run build` thay vì `npx next build` |
| Sidebar tối/sáng không đúng | Sidebar hardcode white (`bg-white`); không còn AppHeader riêng — dashboard dùng layout gốc |
| Brand color trên app vẫn đỏ dù chưa chọn theme đỏ | `:root` mặc định là teal; theme đỏ chỉ khi org.theme = "red" → `ThemeProvider` add `.theme-red`; landing page mặc định `.theme-red` |
| Landing page dùng màu teal thay vì đỏ | `getOrgTheme()` fallback và themeClass default đều là `"red"` → landing luôn dùng `.theme-red` |

## File quan trọng nhất

```
frontend/
  app/
    page.tsx                # Landing page CivicAI (server component)
    layout.tsx              # Root layout: Inter font + Providers
    globals.css             # Brand colors (teal default), theme-red/blue/blue-red, base font
    (auth)/
      login/page.tsx        # Login — design đỏ, watermark SVG, wave
      register/page.tsx     # Register — cùng design với login
      forgot-password/page.tsx  # Quên mật khẩu — form email + DEV token
      reset-password/page.tsx   # Đặt lại mật khẩu — form + Suspense
    dashboard/
      layout.tsx            # Sidebar + main bg-muted/10 (không còn AppHeader riêng)
      ho-so/
        page.tsx            # Danh sách hồ sơ: filter/sort/pagination/stats bar
        new/page.tsx        # Form tạo hồ sơ mới (Shadcn components, drag & drop)
        [id]/page.tsx       # Chi tiết 2 cột: thông tin + stepper 5 bước
    print/[id]/
      DocumentPreview.tsx   # ← PDF dùng Puppeteer render component NÀY (không phải pdf_service)
      page.tsx              # Server component fetch doc → PrintPreview
    api/export/pdf/route.ts # Puppeteer launch → GET /print/{id} → PDF
    dashboard/tools/
      reminders/page.tsx    # Tool: Nhắc hẹn
      speech-to-text/page.tsx  # Tool: Chuyển âm thanh thành văn bản
  components/
    dashboard/sidebar.tsx   # Sidebar trắng, logo đỏ, nav items, user card
    providers/ThemeProvider.tsx  # Fetch org theme → apply class lên <html>
    editor/
      document-editor.tsx   # Wrapper chính, quản lý state editor
      nd30-document.tsx     # Form A4 NĐ30, toolbar, ruler
      WelcomePanel.tsx      # Màn hình chào khi tạo văn bản mới
      extensions.ts         # TipTap extensions registry
      SourcesPanel.tsx      # Cột trái editor: upload, search, rename/delete dropdown
    tools/
      reminders/            # ReminderForm, ReminderList, EmailRecipientsInput
      stt/                  # AudioRecorder, LanguageSelector, TranscriptEditor
  lib/
    api.ts                  # Tất cả API calls chính (authApi có forgotPassword/resetPassword)
    api/reminders.ts        # Reminders API client
    api/stt.ts              # Speech-to-Text API client

backend/
  app/services/
    rag_service.py          # RAG pipeline: retrieve/rerank/generate + retrieve_qa()
    pdf_service.py          # Export PDF (xhtml2pdf); blank mode chỉ render noiDung
    docx_service.py         # Export DOCX (python-docx + lxml); _process_block() table
    pipeline_service.py     # Embedding + _extract_docx() HTML + _extract_pdf() table
    embedding_service.py    # BAAI/bge-m3 singleton
    email_service.py        # SendGrid: gửi .ics nhắc hẹn + gửi email reset password
    ics_service.py          # Generate RFC 5545 .ics (VALARM -PT30M)
    stt_service.py          # Groq Whisper API (httpx async, timeout 60s)
  app/api/v1/endpoints/
    auth.py                 # Login, Register, /forgot-password, /reset-password
    documents.py            # CRUD + _doc_access() admin bypass
    rag.py                  # RAG chat/stream endpoints
    reference_docs.py       # Upload/search reference docs
    reminders.py            # Reminders CRUD + /users/search + /resend
    stt.py                  # /transcribe, /transcribe-realtime, /languages
    ho_so.py                # Hồ sơ hành chính CRUD + stats + 5-bước workflow
  app/models/
    reminder.py             # Model bảng reminders (migration 0020)
    password_reset_token.py # Model bảng password_reset_tokens (migration 0022)
    ho_so.py                # HoSo, HoSoBuoc, HoSoFile (migration 0023)
  app/schemas/
    ho_so.py                # HoSoCreate/Update/Out, BuocUpdate/Out, FileOut, HoSoStats
  alembic/versions/
    0020_create_reminders_table.py
    0021_add_recipients_to_reminders.py
    0022_add_password_reset_tokens.py
    0023_add_ho_so_tables.py
  tests/
    conftest.py             # ASGI fixtures: http, staff_token, admin_token, hs_factory
    test_ho_so.py           # 34 pytest cases cho toàn bộ ho-so endpoints
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
