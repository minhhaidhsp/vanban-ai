# VănBản.AI — Tài liệu Kỹ thuật

> Cập nhật: 2026-06-04
> Phiên bản: Tuần 14+ (pdf2docx export + filter/sort OCR/ref-docs/documents + server-side pagination documents + Railway deploy fixes + OCR textarea fallback)

---

## 1. Tổng quan hệ thống

### Mục đích

VănBản.AI là ứng dụng web hỗ trợ soạn thảo, quản lý và tìm kiếm văn bản hành chính theo chuẩn **Nghị định 30/2020/NĐ-CP** của Chính phủ Việt Nam. Hệ thống cung cấp giao diện soạn thảo trực tiếp trên trang A4, tự động tuân thủ thể thức văn bản (font, lề, bố cục), và tích hợp kho tài liệu tham chiếu có khả năng tìm kiếm ngữ nghĩa.

### Đối tượng sử dụng

Cán bộ, nhân viên văn phòng tại các cơ quan nhà nước, tổ chức cần soạn thảo văn bản hành chính theo chuẩn NĐ 30.

### Các tính năng chính (theo tuần phát triển)

| Tuần | Tính năng |
|------|-----------|
| 1–2 | Đăng ký / đăng nhập JWT, CRUD tài liệu cơ bản, upload file lên MinIO |
| 3 | Soạn thảo văn bản NĐ 30 (Nd30Document), tự động điền số/ký hiệu, tổ chức, ngày tháng |
| 4 | Kho văn bản tham chiếu (reference_documents), upload PDF/DOCX |
| 5 | Embedding pgvector BAAI/bge-m3 cho reference docs (dim=1024) |
| 6 | Chunk-level semantic search (reference_doc_chunks), pipeline tự động |
| 6b | Full-text search tiếng Việt (unaccent + tsvector trigger) |
| 6.5 | Preview mode A4 read-only (DocumentPreview + DocumentPreviewPaged), Ctrl+Shift+P, nút quay lại soạn thảo, xuất PDF (xhtml2pdf + Puppeteer) |
| 7 | vLLM 0.21.0 + Qwen2.5-3B-Instruct trên Google Colab Pro, Cloudflare Tunnel, llm_service.py (chat, health_check, update_base_url), PATCH /llm/config runtime update |
| 8 | LLM trích xuất metadata tự động khi upload (metadata_extraction_service.py, 8 trường + confidence), Redis cache TTL 1h, MetadataReviewCard UI với polling 3s + confidence badges xanh/vàng/đỏ |
| 9 | RAG pipeline đầy đủ: pgvector retrieve → CrossEncoder rerank → Qwen generate → HallucinationGuard validate, trang Tra cứu AI (/dashboard/rag-search) với citation badges, citation cards, LLM status badge |
| 10 | `validate_full()` async (semantic+citation+length weighted confidence), fallback chain (LLM offline → trả chunks, retry 0.35→0.2, hybrid FTS+semantic), system prompt v2, UI: ConfidenceMeter/disclaimer/fallback/CopyButton, Benchmark 10 câu: avg confidence 0.645 |
| 11 | Chat AI panel tích hợp trong editor: SSE token streaming (`chat_stream()`), `ChatPanel.tsx` fixed panel 380px slide animation, multi-turn context (Redis TTL 24h max 20 turns), citation mini cards, nút "Chèn vào văn bản", quick action chips, `doc_context` từ editor, `repetition_penalty=1.15` fix loop Qwen2.5-3B |
| 11+ | Fix data lifecycle: RAG exclude văn bản `het_hieu_luc` (WHERE filter SQL), DELETE xóa MinIO file trước DB (tránh orphan file), CASCADE chunks tự động, PATCH `/hieu-luc` endpoint với validate 4 giá trị hợp lệ, `generate()` cảnh báo ⚠️ khi cite VB hết hiệu lực |
| 12 | Batch upload nhiều văn bản (BackgroundTasks + Redis job tracking + poll status), fix embedding dimension 1536→1024 (BAAI/bge-m3), migration 0008 |
| 12+ | Tách source field documents: 'editor' vs 'upload', migration 0009, filter ?source=editor\|upload, endpoint GET /stats |
| 13 | UI Redesign 4 phase: (1) Tài liệu dạng bảng + filter bar, (2) Dashboard thống kê recharts BarChart+PieChart+metric cards, (3) Kho văn bản phân quyền 3 cấp private/org/system + migration 0010, (4) Editor 3 cột NotebookLM: SourcesPanel + RightPanel Tools/Chat + bảng document_sources migration 0011 |
| 13+ | Flow tạo văn bản mới: NewDocumentModal upload sources → welcome state editor → AI generate (POST /documents/generate), export DOCX (python-docx Times New Roman NĐ30), UploadSourceModal trong SourcesPanel, LLM server chuyển sang transformers+FastAPI (bỏ vLLM CUDA conflict) |
| 13 | Benchmark W13: 20 câu baseline 4 nhóm (chứng thực/hộ tịch/công nghệ/ngoài phạm vi), avg_confidence=0.500, latency=3.2s ✅ |
| 13 | Fine-tune system prompt V2→V3→V4: out_of_scope_correct 80%→100%, fallback_rate 73%→26.7%, latency 6.8s→3.2s ✅ |
| 13 | Setup Groq API (llama-3.3-70b-versatile): fix repetition_penalty Groq-incompatible, chuẩn hóa URL convention base_url/v1 ✅ |
| 14 | Deploy Backend lên Railway Hobby ($5/tháng, 8GB RAM): fix healthcheck timeout (lazy load bge-m3 background task, /health non-blocking), fix Supabase connection (NullPool + Transaction pooler port 6543 + statement_cache_size=0), fix SSL cert verify, Railway port 8080 |
| 14 | Deploy Frontend lên Vercel: fix TypeScript build error Recharts Tooltip formatter, set env vars NEXT_PUBLIC_API_URL/NEXT_PUBLIC_APP_URL/NEXTAUTH_URL, fix CORS ALLOWED_ORIGINS include Vercel domain |
| 14 | Migrate storage MinIO → Cloudflare R2 (boto3): xóa minio client, dùng boto3 S3-compatible, bucket vanban-ai, prefix reference-docs/ cho reference docs, fix R2_ENDPOINT/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY env vars |
| 14 | LLM production: Groq API llama-3.3-70b-versatile (đang dùng), bỏ Colab/Cloudflare Tunnel cho production |
| 14+ | Fix React #185 "Maximum update depth exceeded": `EMPTY_SOURCES` module-level constant tránh inline `[]` mới mỗi render; `handleSourcesChange` dedup trong `DocumentEditor` bảo vệ lớp 2 |
| 14+ | Fix SourcesPanel/SourcePickerModal: guard `docId` bên trong `handleStartUpload` + `try-catch` + guard trong `SourcePickerModal.handleAdd` — tránh unhandled promise rejection leo lên React error boundary |
| 14+ | OCR fallback cho scanned PDF: `pdf2image` + `pytesseract` (lang `vie`, fallback `eng`); `_is_scanned_pdf()` kiểm tra < 50 ký tự; auto-detect path tesseract trên Windows (`C:\Program Files\Tesseract-OCR\tesseract.exe`); Dockerfile thêm `tesseract-ocr`, `tesseract-ocr-vie`, `poppler-utils` |
| 14+ | chunk_count indicator: badge "✓ Đã lập chỉ mục" (xanh) / "⚠ Chưa lập chỉ mục" (đỏ) trong `ref-doc-table` và `SourcePickerModal`; batch-count chunks trong `list_ref_docs` (1 query thêm, không N+1); disable doc chưa index trong SourcePickerModal + tooltip |
| 14+ | Generate system prompt v2: thêm section `== THỂ THỨC TRÌNH BÀY ==` với font Times New Roman 13-14pt và thông số lề NĐ30 (trên/dưới 20-25mm, trái 30-35mm, phải 15-20mm) |
| 14+ | **OCR Viewer** (tính năng hoàn chỉnh): Menu "OCR Văn bản" trong sidebar → `/dashboard/ocr` danh sách văn bản đã index + nút "OCR PDF mới" → `/dashboard/ocr/[id]` viewer 2 cột với export DOCX/PDF; Backend: `POST /ocr/extract` async job (OcrJob DB + Redis file cache base64) + `POST /ocr/export` stateless + GET jobs/status/detail; Migration 0012 `ocr_jobs` table; `ocrApi` trong lib/api.ts |
| 14+ | `/dashboard/ocr` rewrite: hiển thị lịch sử `ocr_jobs` (không còn reference_docs); auto-poll 5s khi có job pending/processing (TanStack Query v5 function `refetchInterval`); badge trạng thái màu theo status |
| 14+ | `/dashboard/ocr/new`: trang upload 2 cột (control trái / kết quả phải); `handleStartOcr` upload → nhận jobId → poll `/ocr/{id}` mỗi 2s; `statusRef` tránh stale closure; `pollRef`/`timeoutRef` cleanup khi unmount; skeleton animation khi processing; timeout 5 phút |
| 14+ | `/dashboard/ocr/[id]` rewrite: đọc từ `ocrApi.getJob` thay `refDocApi.getContent`; guard `status !== "done"` → badge + "Kết quả chưa sẵn sàng"; textarea nội dung + stats page_count/char_count/created_at |
| 14+ | Deploy fix: `alembic upgrade head &&` trước `uvicorn` trong `railway.toml` `startCommand` + `nixpacks.toml` `[start] cmd` — đảm bảo migration 0012 được apply tự động khi Railway deploy |
| 14+ | **OCR LLM formatting** (migration 0013): thêm cột `formatted_text` vào `ocr_jobs`; `_format_ocr_text()` gọi Groq llama-3.3-70b tái cấu trúc text OCR thô → văn bản có định dạng đẹp (paragraph, tiêu đề, danh sách); `_basic_format()` fallback khi LLM offline; frontend hiển thị `formatted_text \|\| text` trong textarea |
| 14+ | **OCR export fix**: `POST /ocr/export` tách text thành paragraph (`split("\n\n")`) trước khi tạo file; DOCX: Times New Roman 13pt per paragraph; PDF: `<p>` tags thay `<pre>` + `\n→<br/>`; split button Word (primary) + ChevronDown dropdown PDF; `exportFormat` state cập nhật label nút chính khi chọn format khác |
| 14+ | **OCR file_type detection + R2 upload** (migration 0014): `file_type` (`text_pdf`/`scanned_pdf`/`image`/`text_docx`) + `file_path` cột mới; `_detect_pdf_type()` detect PDF có text layer (pdfplumber < 50 ký tự → scanned); text PDF → upload file gốc lên R2 (`ocr-jobs/{job_id}/{filename}`) + `_process_text_pdf()` background task; `GET /ocr/{job_id}/download` stream file gốc từ R2; frontend: nút "Tải file gốc" cho text_pdf thay split Word/PDF |
| 14+ | **OCR real-time progress bar**: `_ocr_pdf_with_progress()` update Redis `ocr_progress:{job_id}` sau mỗi trang scan; `GET /ocr/progress/{job_id}` trả `{current_page, total_pages, percent}`; frontend poll mỗi 1s song song với status poll — progress bar hiển thị "X/Y trang" + `%`; `progressPollRef` cleanup đúng khi done/error/unmount |
| 14+ | **OCR DOCX support**: `POST /ocr/extract` chấp nhận `application/vnd.openxmlformats-officedocument.wordprocessingml.document`; `file_type="text_docx"`; `_process_text_docx()` dùng `python-docx` extract paragraphs trong thread + LLM format; frontend: `accept=".pdf,.jpg,.jpeg,.png,.docx"`, badge tím "📝 Word" trong danh sách |
| 14+ | **OCR danh sách cải tiến**: phân trang (LIMIT=10, `Pagination` component); cột "Loại" với badge màu (📄 xanh=text_pdf, 📝 tím=text_docx, 🔍 cam=OCR); hành động phân theo `file_type` (text_pdf → nút Download file gốc; còn lại → dropdown Word/PDF) |
| 14+ | **OCR react-pdf viewer**: cài `react-pdf ^10.4.1`; `PdfViewer.tsx` component với toolbar phân trang (prev/next) + zoom (50%–200%); thay `<iframe>` bằng `<Document><Page>` component trong `new/page.tsx` và `[id]/page.tsx`; workerSrc dùng CDN unpkg tránh webpack config |
| 14+ | **pipeline_service image OCR**: `_ocr_image_bytes()` mới — hỗ trợ `image/jpeg`, `image/png`, `image/bmp`, `image/tiff`, `image/webp` trong kho văn bản tham chiếu; phát hiện qua MIME type `mime.startswith("image/")` trong `_extract_text()`; không cần validation whitelist trong `reference_docs.py` (không có) |
| 14+ | **OCR unified PDF viewer** (`_create_pdf_from_text`): sau mỗi OCR job done, hàm mới tạo PDF từ `formatted_text` (fallback `text`) qua `pdf_service._write_pdf`, upload lên R2 `ocr-jobs/{job_id}/{name}_ocr.pdf`, lưu vào `job.file_path`; áp dụng cho `_process_ocr_job` (scanned_pdf/image) và `_process_text_docx`; `_process_text_pdf` không cần (file gốc đã ở R2); download endpoint bỏ điều kiện `file_type=="text_pdf"` → chỉ check `not job.file_path`; frontend fetch PDF cho MỌI job type khi done → PdfViewer hoặc textarea fallback nếu file_path=None |
| 14+ | **PdfViewer scroll mode**: bỏ page navigation (prev/next, pageNumber state); render tất cả trang liên tiếp `Array.from({ length: numPages }, (_, i) => <Page pageNumber={i+1} />)` trong một scroll container; toolbar chỉ còn tổng số trang + ZoomIn/Out (50%–200%); `div.content: flex-1 overflow-y-auto, style={{ minHeight: 0 }}` để scroll bên trong; bỏ import `ChevronLeft`, `ChevronRight` |
| 14+ | **OCR full-height layout** (`new/page.tsx`, `[id]/page.tsx`): cột chứa PdfViewer đổi từ `overflow-y-auto p-6` sang `flex flex-col min-h-0 overflow-hidden`; header/breadcrumb thêm `shrink-0`; wrapper viewer có `flex-1 flex flex-col min-h-0`; PdfViewer và textarea đều có `flex-1 min-h-0` (bỏ `min-h-[500px]`, `min-h-[600px]`); `min-h-0` critical để flex child có thể shrink |
| 14+ | **pdfUrl useEffect fix** (`/ocr/new`): `OcrResult` type không có field `status` — điều kiện `result?.status !== "done"` luôn `undefined`/falsy → useEffect không trigger; **fix**: dùng component state `status: OcrStatus` thay vì `result?.status`; dependency array `[status, jobId]` thay `[result?.status, jobId]`; thêm retry logic (5 lần, 2s delay) vì R2 upload sau OCR có thể lag vài giây |
| 14+ | **react-pdf downgrade v10→v7**: pdfjs-dist v4 (dùng bởi v10) dùng ESM `.mjs` không tương thích webpack Next.js 14 — `Object.defineProperty called on non-object`; v7 dùng pdfjs-dist v3 CJS `.js`; CSS path đổi `dist/Page/` → `dist/esm/Page/`; workerSrc đổi `.mjs` → `.js`; `next.config.js` thêm `canvas=false` alias; CSS imports chuyển sang `globals.css` |
| 14+ | **OCR badge fix** (`/dashboard/ocr`): bỏ emoji (📄📝🔍) khỏi badge file_type; thêm `whitespace-nowrap` tránh xuống hàng trong cột hẹp; bỏ `gap-1` (không cần khi không có icon) |
| 14+ | **OCR filter + sort** (`/dashboard/ocr`): backend `GET /ocr/jobs` thêm `status`, `file_type`, `sort_by`, `sort_order` params; frontend filter bar (select trạng thái + loại); sortable headers (Tên file, Số trang, Ngày tạo); `exportingJobId` state → loading spinner per-job; always-show table với empty row; bỏ text "Hiển thị 0/0 kết quả" |
| 14+ | **pdf2docx export** (`GET /ocr/{job_id}/export/docx`): convert file gốc PDF sang DOCX giữ layout qua `pdf2docx.Converter`; chạy trong thread với temp files cleanup; `requirements.txt` thêm `pdf2docx>=0.5.6`; `Dockerfile` thêm `libglib2.0-0`; `ocrApi.exportDocx()`; `handleExport` phân nhánh: text_pdf → pdf2docx/download-original; scanned/image/docx → text-based export |
| 14+ | **Ref-docs sort** (`ref-doc-table.tsx`): thêm sortable cho 3 cột nữa: `so_ki_hieu`, `loai_van_ban`, `ngay_ban_hanh` (cùng với `created_at`); `whitespace-nowrap` tất cả `<th>`; always-show table thay vì empty state div |
| 14+ | **Documents server-side** (`/dashboard/documents`): `GET /documents/` thêm `q` (ILIKE title), `loai_vb`, `sort_by`, `sort_order` params + count query + trả `{items, total}`; `document-list.tsx` migrate từ fetch-200-client-filter sang server-side: `useDebounce(qInput, 300)`, `limit=20`, query key per-filter, sort headers (Tên/Loại/Ngày tạo), always-show table, Pagination từ `data.total` |
| 14+ | **DashboardOverview bug fix** (`recentDocs.map is not a function`): `documentApi.list` trả `{items, total}` nhưng `useQuery<DocumentDto[]>` typed sai → `recentDocs` là object thay vì array; fix: type đúng `{items, total}`, extract `recentData?.items ?? []`; sửa thêm param `sort` → `sort_by` |
| 14+ | **OCR textarea fallback cải tiến** (`showTextFallback` state): trước đây textarea hiển thị ngay khi `pdfUrl===null` kể cả trong lúc retry 5×2s; thêm `showTextFallback` state chỉ set `true` sau khi MAX_RETRY hết → textarea không flash rồi biến mất khi PDF load thành công; `ocr/[id]/page.tsx` nâng từ 1 lần thử lên retry 5× với delay 2s |
| 14+ | **Railway deploy overhaul**: bỏ `alembic upgrade head &&` khỏi `startCommand` (chạy migration thủ công); `railway.toml` root + `backend/railway.json` đều dùng port 8080; `healthcheckTimeout` 300→600; `backend/railway.json` bỏ NIXPACKS builder để Railway tự detect Dockerfile; `Dockerfile` sửa `EXPOSE 8000→8080`, đổi CMD sang exec form `["uvicorn", ...]`; thêm `restartPolicyMaxRetries: 3` |
| 14+ | **pdf2docx lazy import guard**: `GET /ocr/{job_id}/export/docx` thêm `try: from pdf2docx import Converter except ImportError: raise HTTPException(503)` — nếu package chưa install sẽ trả 503 thay vì crash server; `pdf2docx>=0.5.6` trong `requirements-railway.txt` |
| 14+ | **Startup error logging**: lifespan `asyncio.create_task(_load_models())` wrap trong `try/except` — nếu crash sẽ print traceback ra stderr thay vì im lặng; thêm `backend/start.sh` (import test script chạy trước uvicorn để pinpoint module nào lỗi) |
| 14+ | **clear_all_data.py script** (`backend/scripts/`): script xóa toàn bộ data dev — xóa DB tables theo thứ tự FK (chunks → reference_documents → ocr_jobs → documents) rồi xóa R2 files theo prefix `reference-docs/` và `ocr-jobs/`; confirm "XOA" trước khi thực thi |

### Tech stack thực tế

**Frontend:**
- Next.js 14.2.18 (App Router, SSR/SSG)
- React 18, TypeScript 5
- TipTap 3.23.6 (editor phong phú: StarterKit, Underline, TextAlign, Highlight, Placeholder)
- TanStack Query 5.62.11 (data fetching và caching)
- Axios 1.7.9 (HTTP client)
- fetch ReadableStream API (SSE client cho streaming chat — thay axios)
- Tailwind CSS 3.4.1 + Radix UI (shadcn/ui components)
- Zod 3.24.1 + React Hook Form 7.54.2 (form validation)
- Puppeteer 25.0.4 (xuất PDF phía server Next.js)
- react-pdf 10.4.1 (render PDF trong browser; pdfjs-dist CDN worker)
- js-cookie 3.0.5 (lưu JWT token)

**Backend:**
- FastAPI 0.115.5 + Uvicorn 0.32.1
- SQLAlchemy 2.0.36 (async, asyncpg driver)
- Alembic 1.14.0 (migration)
- PostgreSQL + pgvector 0.3.6 (vector similarity search)
- Redis 5.2.1 (cache, dùng redis.asyncio)
- boto3 ≥1.34.0 + botocore (Cloudflare R2, S3-compatible)
- SQLAlchemy NullPool (thay QueuePool) — tương thích Supabase Transaction pooler
- python-jose 3.3.0 + passlib[bcrypt] 1.7.4 (JWT auth)
- sentence-transformers ≥3.0.0 với model **BAAI/bge-m3** (dim=1024)
- cross-encoder/ms-marco-MiniLM-L-6-v2 (reranker cho RAG pipeline)
- httpx ≥0.27.0 (async HTTP client cho LLM API — cả non-stream và stream)
- FastAPI `StreamingResponse` (SSE streaming — built-in, không cần sse-starlette)
- pdfplumber ≥0.11.0 (trích xuất text từ PDF)
- pdf2image ≥1.16.0 + pytesseract ≥0.3.10 (OCR fallback cho scanned PDF; yêu cầu system: `tesseract-ocr`, `tesseract-ocr-vie`, `poppler-utils`)
- python-docx ≥1.1.0 (trích xuất text từ DOCX)
- xhtml2pdf ≥0.2.0 + ReportLab (xuất PDF phía backend)
- Pydantic 2.10.3 + pydantic-settings 2.6.1

**External services:**
- Groq API llama-3.3-70b-versatile (production: OpenAI-compatible, free tier)
- Cloudflare R2 (object storage S3-compatible, boto3 client, 10GB free)
- Supabase PostgreSQL (cloud DB, Transaction pooler port 6543)
- Upstash Redis (cloud Redis, TLS rediss://)
- Railway Hobby (backend deploy, 8GB RAM, $5/tháng, port 8080)
- Vercel (frontend deploy, Next.js free tier)

---

## 2. Kiến trúc hệ thống

### Sơ đồ ASCII

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                     │
│  Next.js 14 (App Router)  ←→  TipTap Editor                 │
│  TanStack Query  ←→  Axios  ←→  js-cookie (JWT)             │
└────────────────────┬────────────────────────────────────────┘
                     │  HTTP REST (JSON)
                     │  Bearer Token (JWT)
┌────────────────────▼────────────────────────────────────────┐
│              BACKEND (FastAPI + Uvicorn)                     │
│  /api/v1/auth        /api/v1/documents                       │
│  /api/v1/users       /api/v1/reference-docs                  │
│  /api/v1/constants   /api/v1/organizations                   │
│  /api/v1/recipient-suggestions                               │
│  /api/v1/llm         /api/v1/rag                             │
│                                                              │
│  Services: embedding_service, chunking_service,              │
│            pipeline_service, pdf_service,                    │
│            llm_service, rag_service, hallucination_guard,    │
│            metadata_extraction_service                       │
└────┬───────────────┬──────────────────┬──────────────────────────┘
     │               │                  │  HTTPS (httpx)
     │               │                  │  ┌────────────────────────┐
     │               │                  └─►│ Cloudflare Tunnel       │
     │               │                     │ → vLLM (Colab T4 GPU)   │
     │               │                     │   Qwen2.5-3B-Instruct   │
     │               │                     └────────────────────────┘
     │               │
┌────▼───┐    ┌──────▼──────┐    ┌─────────────┐
│ Redis  │    │ PostgreSQL   │    │   MinIO      │
│ Cache  │    │ + pgvector   │    │ Object Store │
│        │    │ + unaccent   │    │ Bucket:      │
│        │    │ + pg_trgm    │    │ vanban-ai    │
└────────┘    └─────────────┘    │ reference-   │
                                 │ docs         │
                                 └─────────────┘

Frontend Next.js API Route:
  POST /api/export/pdf  ←  Puppeteer  →  /print/[id]  (SSR page)
```

### Luồng dữ liệu tổng thể

1. **Soạn thảo:** Frontend → `PATCH /api/v1/documents/{id}` → PostgreSQL `documents`
2. **Upload tài liệu tham chiếu:** Frontend → `POST /api/v1/reference-docs/{id}/upload` → MinIO → BackgroundTask (pipeline)
3. **Pipeline embedding:** pipeline_service → MinIO (download) → pdfplumber/python-docx (extract) → chunking_service → embedding_service (BAAI/bge-m3) → PostgreSQL `reference_doc_chunks`
4. **Tìm kiếm:** Frontend → `/reference-docs/search` (semantic) hoặc `/reference-docs/search/fulltext` (FTS) → PostgreSQL pgvector/tsvector
5. **Xuất PDF (Puppeteer):** Frontend → Next.js API `/api/export/pdf` → Puppeteer → `/print/{id}` → PDF bytes
6. **Xuất PDF (xhtml2pdf):** Frontend → `POST /api/v1/documents/{id}/export/pdf` → pdf_service → xhtml2pdf → PDF bytes

---

## 3. Cấu trúc thư mục

### Frontend (`frontend/`)

```
frontend/
├── app/
│   ├── layout.tsx               # Root layout: Inter font, Providers, Toaster
│   ├── page.tsx                 # Landing page (marketing)
│   ├── error.tsx                # Global error boundary
│   ├── (auth)/
│   │   ├── login/page.tsx       # Form đăng nhập (Zod + react-hook-form)
│   │   └── register/page.tsx    # Form đăng ký
│   ├── dashboard/
│   │   ├── layout.tsx           # Dashboard layout: Sidebar + main content
│   │   ├── page.tsx             # Trang tổng quan → DocumentList component
│   │   ├── documents/
│   │   │   ├── new/page.tsx     # Tạo văn bản mới → DocumentEditor (SSR=false)
│   │   │   └── [id]/page.tsx    # Chỉnh sửa văn bản → DocumentEditor
│   │   ├── reference-docs/
│   │   │   └── page.tsx         # Kho văn bản tham chiếu (filter, phân trang)
│   │   ├── ocr/
│   │   │   ├── page.tsx         # Lịch sử ocr_jobs; phân trang LIMIT=10; cột "Loại" badge file_type; auto-poll 5s
│   │   │   ├── new/page.tsx     # Upload 2 cột: drag-drop (PDF/JPG/PNG/DOCX) → extract job → progress bar → PdfViewer/textarea
│   │   │   └── [id]/page.tsx    # Viewer 2 cột: PdfViewer (text_pdf) / textarea (scan/DOCX) + stats
│   │   └── rag-search/
│   │       └── page.tsx         # Tra cứu AI: search bar, ConfidenceMeter, disclaimer/fallback banners, CopyButton, citation cards
│   ├── print/
│   │   ├── layout.tsx           # Print layout (minimal)
│   │   └── [id]/
│   │       ├── page.tsx         # Server component: fetch doc → PrintPreview
│   │       └── PrintPreview.tsx # Client wrapper → DocumentPreview
│   └── api/
│       └── export/pdf/
│           └── route.ts         # Next.js API Route: Puppeteer PDF export
├── components/
│   ├── providers.tsx            # TanStack Query + Toast providers
│   ├── dashboard/
│   │   ├── sidebar.tsx          # Nav sidebar: Tổng quan, Tài liệu, Kho văn bản, Tra cứu AI...
│   │   ├── document-list.tsx    # Grid danh sách tài liệu, nút xóa/sửa
│   │   └── document-dialog.tsx  # Dialog tạo tài liệu mới (title)
│   ├── editor/
│   │   ├── nd30-document.tsx    # Soạn thảo A4 NĐ30 (toàn bộ thể thức)
│   │   ├── document-editor.tsx  # Wrapper 3 cột: autosave, preview, PDF export, welcome state
│   │   ├── SourcesPanel.tsx     # Cột trái: upload tài liệu tham chiếu, badge chunk_count, guard docId
│   │   ├── SourcePickerModal.tsx # Modal chọn từ kho: badge "Đã lập chỉ mục", disable chưa xử lý
│   │   ├── RightPanel.tsx       # Cột phải: tabs Tools (ToolCard) + Chat AI (SSE streaming)
│   │   ├── ResizeHandle.tsx     # Drag-to-resize handle cho cột trái/phải
│   │   ├── DocumentPreview.tsx  # Preview read-only A4 NĐ30
│   │   ├── DocumentPreviewPaged.tsx # Preview có nút xuất PDF/DOCX
│   │   ├── editor-toolbar.tsx   # TipTap toolbar (bold, italic, align...)
│   │   ├── nd30-field.tsx       # Inline editable field theo chuẩn NĐ30
│   │   └── recipient-tag-input.tsx  # Tag input cho Nơi nhận
│   ├── reference-docs/
│   │   ├── ref-doc-table.tsx    # Bảng danh sách: badge "✓ Đã lập chỉ mục" / "⚠ Chưa lập chỉ mục"
│   │   ├── upload-modal.tsx     # Dialog thêm/sửa + upload file
│   │   ├── RefDocBatchUploadModal.tsx # Batch upload nhiều file, polling job status
│   │   └── MetadataReviewCard.tsx  # Dialog polling + review metadata từ LLM
│   ├── ocr/
│   │   └── PdfViewer.tsx        # react-pdf viewer: toolbar phân trang + zoom 50–200%; workerSrc CDN
│   └── ui/                      # shadcn/ui components (Button, Input, Dialog...)
├── lib/
│   ├── api.ts                   # Axios client + authApi, documentApi, refDocApi, ocrApi, chatApi (SSE)
│   ├── nd30.ts                  # Hằng số NĐ30, kiểu Nd30Data, helper functions
│   └── utils.ts                 # cn() utility (clsx + tailwind-merge)
└── hooks/
    ├── use-autosave.ts          # Auto-save hook (30s interval)
    ├── use-debounce.ts          # Debounce hook cho search
    └── use-toast.ts             # Toast notification hook
```

### Backend (`backend/`)

```
backend/
├── app/
│   ├── main.py                  # FastAPI app, CORS, lifespan (MinIO buckets + eager load model)
│   ├── api/
│   │   ├── deps.py              # get_current_user dependency (JWT decode)
│   │   └── v1/
│   │       ├── router.py        # include_router cho tất cả endpoints
│   │       └── endpoints/
│   │           ├── auth.py      # POST /login, POST /register
│   │           ├── users.py     # GET /me
│   │           ├── documents.py # CRUD documents + export/pdf + upload
│   │           ├── organizations.py  # GET /current
│   │           ├── recipient_suggestions.py  # GET /  POST /increment
│   │           ├── reference_docs.py  # CRUD + upload + 3 search + metadata + /content + /export
│   │           ├── ocr.py             # POST /extract (detect file_type, R2 upload cho text_pdf) + /export + GET /jobs /status/{id} /progress/{id} /{id}/download /{id}
│   │           ├── llm.py             # GET /health, POST /test, PATCH /config
│   │           ├── rag.py             # GET /health, POST /query, POST /query/stream, POST /chat/stream, GET+DELETE /chat/history
│   │           └── constants.py # GET /nd30 (hằng số NĐ30)
│   ├── core/
│   │   ├── config.py            # Settings (pydantic-settings, .env)
│   │   ├── database.py          # AsyncEngine, AsyncSessionLocal, Base
│   │   ├── security.py          # JWT create/decode, bcrypt hash/verify
│   │   ├── storage.py           # MinIO client, upload_file, get_file_url
│   │   └── redis.py             # aioredis client singleton
│   ├── models/
│   │   ├── user.py              # User ORM model
│   │   ├── document.py          # Document ORM model (với Vector(1536))
│   │   ├── organization.py      # Organization ORM model
│   │   ├── reference_document.py  # ReferenceDocument (Vector(1024) + TSVECTOR)
│   │   ├── reference_doc_chunk.py # ReferenceDocChunk (Vector(1024))
│   │   ├── ocr_job.py           # OcrJob — async OCR job tracking (status, text, page_count, char_count, file_type, file_path, formatted_text)
│   │   └── recipient_suggestion.py # RecipientSuggestion
│   ├── schemas/
│   │   ├── user.py              # UserCreate, UserResponse, Token
│   │   ├── document.py          # DocumentCreate/Update/Response
│   │   ├── reference_document.py  # RefDocCreate/Update/Response + search + ChunkItem + RefDocContentResponse
│   │   └── ocr_job.py           # OcrJobResponse, OcrJobStatusResponse, OcrJobListResponse
│   ├── services/
│   │   ├── embedding_service.py # BAAI/bge-m3 singleton, embed_text(), embed_batch()
│   │   ├── chunking_service.py  # chunk_document() — Điều/Khoản/Mục + sliding window
│   │   ├── pipeline_service.py  # process_document_embedding() BackgroundTask
│   │   ├── pdf_service.py       # generate_pdf() — xhtml2pdf + DejaVu Serif
│   │   ├── llm_service.py       # LLMService singleton — chat(), chat_stream(), health_check(), update_base_url()
│   │   ├── metadata_extraction_service.py  # extract_metadata(), save/get_metadata_preview()
│   │   ├── rag_service.py       # RAGService — retrieve, rerank, build_context, generate, query
│   │   ├── hallucination_guard.py  # validate(answer, chunks) → ValidationResult
│   │   └── chat_history_service.py  # get_history(), save_turn(), clear_history() — Redis TTL 24h
│   └── constants/
│       └── nd30_2020.py         # Hằng số NĐ30 (FontStyle, VAN_BAN_TYPES, templates...)
├── alembic/
│   ├── env.py                   # Alembic config
│   └── versions/
│       ├── 0001_initial.py      # users, documents tables
│       ├── 0002_week3_features.py  # organizations, recipient_suggestions, loai_vb
│       ├── 0003_reference_docs.py  # reference_documents table
│       ├── 0004_ref_doc_embedding.py  # embedding column + ivfflat index
│       ├── 0005_ref_doc_chunks.py   # reference_doc_chunks table
│       ├── 0006_fts.py          # search_vector column + trigger + GIN index
│       ├── ...                  # 0007–0011: source, visibility, document_sources
│       └── 0012_ocr_jobs.py     # ocr_jobs table + 3 indexes
└── requirements.txt
```

---

## 4. Database Schema

### Bảng `users`

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | VARCHAR(36) PK | UUID v4 |
| `email` | VARCHAR(255) UNIQUE | Email đăng nhập (indexed) |
| `full_name` | VARCHAR(255) | Họ tên đầy đủ |
| `hashed_password` | VARCHAR(255) | bcrypt hash |
| `is_active` | BOOLEAN | Tài khoản còn hoạt động (default true) |
| `is_superuser` | BOOLEAN | Quyền admin (default false) |
| `created_at` | TIMESTAMPTZ | Thời điểm tạo |
| `updated_at` | TIMESTAMPTZ | Thời điểm cập nhật |

### Bảng `documents`

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | VARCHAR(36) PK | UUID v4 |
| `title` | VARCHAR(500) | Tiêu đề văn bản (= trichYeu hoặc coQuanBanHanh) |
| `content` | TEXT | JSON string với `version: "nd30"` + toàn bộ Nd30Data |
| `file_path` | VARCHAR(1000) | Object path trên MinIO bucket `vanban-ai` |
| `file_type` | VARCHAR(50) | MIME type của file đính kèm |
| `loai_vb` | VARCHAR(10) | Loại văn bản: QĐ, CV, NQ, ... (indexed) |
| `so_van_ban` | INTEGER | Số thứ tự trong năm |
| `nam` | INTEGER | Năm ban hành |
| `owner_id` | VARCHAR(36) FK → users.id CASCADE | Chủ sở hữu (indexed) |
| `embedding` | vector(1536) | Vector embedding (dùng cho tương lai) |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Index:** HNSW index trên cột `embedding` (`vector_cosine_ops`, m=16, ef_construction=64); composite index `(loai_vb, nam)`.

### Bảng `organizations`

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | VARCHAR(36) PK | UUID v4 |
| `ten_chu_quan` | VARCHAR(500) | Tên cơ quan chủ quản |
| `ten_co_quan` | VARCHAR(500) | Tên cơ quan ban hành |
| `viet_tat` | VARCHAR(50) | Viết tắt (default "UBND") |
| `dia_danh` | VARCHAR(100) | Địa danh (default "TP. Ho Chi Minh") |
| `chu_ky_mac_dinh` | JSON | `{quyen_han, ten_tap_the, chuc_vu}` |
| `is_active` | BOOLEAN | Cơ quan đang hoạt động |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Dữ liệu seed:** `org-default-001` — UBND THANH PHO HO CHI MINH / UBND PHUONG NHIEU LOC.

### Bảng `recipient_suggestions`

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | VARCHAR(36) PK | UUID v4 |
| `name` | VARCHAR(500) UNIQUE | Tên nơi nhận (vd: "- Như trên;") |
| `frequency` | INTEGER | Số lần sử dụng (dùng để sắp xếp gợi ý) |
| `created_at` | TIMESTAMPTZ | |

**Dữ liệu seed:** 5 gợi ý phổ biến như "- Như trên;", "- Lưu: VT.", v.v.

### Bảng `reference_documents`

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | VARCHAR(36) PK | UUID v4 |
| `title` | VARCHAR(500) | Tên đầy đủ của văn bản |
| `loai_van_ban` | VARCHAR(20) | Loại: Nghị định, Thông tư, Quyết định... (indexed) |
| `so_ki_hieu` | VARCHAR(200) | Số và ký hiệu (vd: "30/2020/NĐ-CP") |
| `ngay_ban_hanh` | DATE | Ngày ký ban hành |
| `co_quan_ban_hanh` | VARCHAR(500) | Cơ quan ban hành |
| `nguoi_ky` | VARCHAR(200) | Người ký văn bản |
| `trich_yeu` | TEXT | Trích yếu nội dung |
| `hieu_luc` | VARCHAR(20) | `"chua"` / `"con_hieu_luc"` / `"het_hieu_luc"` / `"mot_phan"` (indexed). **RAG filter:** chỉ search khi `!= "het_hieu_luc"` — VB hết hiệu lực vẫn lưu DB nhưng không được cite |
| `file_path` | VARCHAR(1000) | Object path trong MinIO bucket `reference-docs` |
| `file_size` | INTEGER | Kích thước file (bytes) |
| `file_type` | VARCHAR(100) | MIME type |
| `tom_tat` | TEXT | Tóm tắt nội dung (tùy chọn) |
| `tu_khoa` | JSON | Mảng từ khóa `["keyword1", "keyword2"]` |
| `embedding` | vector(1024) | Document-level embedding từ BAAI/bge-m3 |
| `search_vector` | TSVECTOR | Full-text search vector (tự động cập nhật qua trigger) |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |
| `created_by` | VARCHAR(36) FK → users.id CASCADE | Người tạo (indexed) |

**Index:**
- `ix_ref_docs_embedding`: IVFFlat cosine, lists=100
- `idx_fts_reference_documents`: GIN index trên `search_vector`
- Index trên `loai_van_ban`, `hieu_luc`, `created_by`

**PostgreSQL trigger `trig_search_vector`:** Trước INSERT/UPDATE, tự động cập nhật `search_vector` từ `title` (weight A), `so_ki_hieu` (A), `trich_yeu` (B), `co_quan_ban_hanh` (C), `tom_tat` (D) qua `unaccent()`.

### Bảng `reference_doc_chunks`

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | VARCHAR(36) PK | UUID v4 |
| `document_id` | VARCHAR(36) FK → reference_documents.id CASCADE | Văn bản cha (indexed) |
| `chunk_index` | INTEGER | Thứ tự chunk (0-based) |
| `content` | TEXT | Nội dung chunk đã thêm context prefix |
| `dieu_khoan` | VARCHAR(200) | Điều/Khoản/Mục tương ứng (nếu có) |
| `token_count` | INTEGER | Số token ước tính (chars/4) |
| `embedding` | vector(1024) | Chunk-level embedding từ BAAI/bge-m3 |
| `created_at` | TIMESTAMPTZ | |

**Index:** `ix_ref_doc_chunks_document_id`; IVFFlat cosine index `ix_ref_doc_chunks_embedding`, lists=100.

### Bảng `ocr_jobs`

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | VARCHAR(36) PK | UUID v4 |
| `user_id` | VARCHAR(36) | Soft reference → users.id (không FK, tránh cascade) (indexed) |
| `filename` | VARCHAR(500) | Tên file gốc được OCR |
| `status` | VARCHAR(20) | `"pending"` / `"processing"` / `"done"` / `"error"` (indexed) |
| `text` | TEXT | Kết quả OCR — null khi chưa xong |
| `page_count` | INTEGER | Số trang — null khi chưa xong |
| `char_count` | INTEGER | Số ký tự kết quả — null khi chưa xong |
| `error_msg` | TEXT | Thông báo lỗi nếu status=error |
| `file_type` | VARCHAR(20) | `"text_pdf"` / `"scanned_pdf"` / `"image"` / `"text_docx"` — null cho jobs cũ |
| `file_path` | VARCHAR(1000) | R2 object path (`ocr-jobs/{job_id}/{filename}`) — chỉ có với text_pdf |
| `formatted_text` | TEXT | Text sau LLM reformatting — null khi LLM offline hoặc chưa xong |
| `created_at` | TIMESTAMPTZ | (indexed) |
| `updated_at` | TIMESTAMPTZ | Auto-update khi row thay đổi |

**Index:** `ix_ocr_jobs_user_id`, `ix_ocr_jobs_status`, `ix_ocr_jobs_created_at`.

**Luồng trạng thái:** `pending` → `processing` → `done` | `error`.

**Phân loại theo `file_type`:**
- `text_pdf`: pdfplumber extract ≥ 50 ký tự → text layer, file gốc upload R2, `_process_text_pdf()` background task
- `scanned_pdf`: pdfplumber extract < 50 ký tự → scanned, `_ocr_pdf_with_progress()` (pdf2image + pytesseract per trang với Redis progress), `_process_ocr_job()` background task
- `image`: JPEG/PNG, `_process_ocr_job()` (PIL + pytesseract)
- `text_docx`: DOCX, `_process_text_docx()` (python-docx + LLM format)

**Redis keys liên quan:**
- `ocr_file:{job_id}`: file bytes base64 TTL 1h — chỉ dùng cho scanned_pdf/image
- `ocr_progress:{job_id}`: `{current_page, total_pages}` TTL 1h — chỉ có khi đang OCR scan, tự xóa sau khi xong

### Quan hệ giữa các bảng

```
users (1) ──< documents (N)             [owner_id → users.id]
users (1) ──< reference_documents (N)   [created_by → users.id]
users (1) ──  ocr_jobs (N)              [user_id — soft ref, no FK]
reference_documents (1) ──< reference_doc_chunks (N) [document_id → reference_documents.id]
```

### Danh sách migration versions

| Version | Nội dung |
|---------|----------|
| `0001` | Tạo extension pgvector; tạo bảng `users`, `documents` |
| `0002` | Thêm `loai_vb`, `so_van_ban`, `nam` vào documents; tạo `organizations`, `recipient_suggestions`; seed dữ liệu mặc định |
| `0003` | Tạo bảng `reference_documents` với tất cả metadata |
| `0004` | Thêm cột `embedding vector(1024)` + IVFFlat index cho `reference_documents` |
| `0005` | Tạo bảng `reference_doc_chunks` + IVFFlat index cho embedding chunk |
| `0006` | Extension `unaccent` + `pg_trgm`; thêm cột `search_vector tsvector`; tạo GIN index; tạo trigger `update_search_vector` |
| `0007` | Thêm `source` field vào documents ('editor'\|'upload') |
| `0008` | Fix embedding dimension 1536→1024 |
| `0009` | Tách source field documents |
| `0010` | Thêm `visibility` vào reference_documents (private/org/system) |
| `0011` | Tạo bảng `document_sources` (junction: documents ↔ reference_documents) |
| `0012` | Tạo bảng `ocr_jobs` + 3 index (user_id, status, created_at) |
| `0013` | Thêm cột `formatted_text TEXT nullable` vào `ocr_jobs` (LLM-reformatted output) |
| `0014` | Thêm `file_type VARCHAR(20) nullable` + `file_path VARCHAR(1000) nullable` vào `ocr_jobs` |

---

## 5. API Endpoints

Tất cả endpoints đều có prefix `/api/v1`. Xác thực bằng `Authorization: Bearer <jwt_token>` (trừ `/auth/login` và `/auth/register`).

### Auth (`/auth`)

| Method | Path | Mô tả | Request | Response |
|--------|------|-------|---------|----------|
| POST | `/auth/login` | Đăng nhập | `form: username, password` (x-www-form-urlencoded) | `{access_token, token_type}` |
| POST | `/auth/register` | Đăng ký tài khoản mới | `{email, full_name, password}` | `UserResponse` (201) |

### Users (`/users`)

| Method | Path | Mô tả | Response |
|--------|------|-------|----------|
| GET | `/users/me` | Lấy thông tin user hiện tại | `{id, email, full_name, is_active, created_at}` |

### Documents (`/documents`)

| Method | Path | Mô tả | Request | Response |
|--------|------|-------|---------|----------|
| GET | `/documents/` | Danh sách văn bản của user | `?skip&limit&source&q&loai_vb&sort_by&sort_order` | `{items: DocumentResponse[], total: int}` |
| POST | `/documents/` | Tạo văn bản mới | `{title, content?, loai_vb?, so_van_ban?, nam?}` | `DocumentResponse` (201) |
| GET | `/documents/stats` | Thống kê văn bản | — | `{total, editor_count, upload_count, by_type, recent_7_days}` |
| GET | `/documents/next-number` | Lấy số thứ tự tiếp theo | `?loai=QĐ` | `{so, nam, loai}` |
| POST | `/documents/generate` | Gọi LLM soạn thảo từ mô tả + RAG context | `{document_id, loai_van_ban, yeu_cau, source_ids[]}` | `{status, document_id, content}` |
| GET | `/documents/{id}` | Lấy chi tiết văn bản | — | `DocumentResponse` |
| PATCH | `/documents/{id}` | Cập nhật văn bản | `DocumentUpdate` (partial) | `DocumentResponse` |
| DELETE | `/documents/{id}` | Xóa văn bản | — | 204 No Content |
| POST | `/documents/{id}/export/pdf` | Xuất PDF (xhtml2pdf) | — | PDF binary (`application/pdf`) |
| POST | `/documents/{id}/export/docx` | Xuất DOCX (python-docx NĐ30 Times New Roman) | — | DOCX binary |
| POST | `/documents/{id}/upload` | Upload file đính kèm | `multipart: file` | `DocumentResponse` |
| POST | `/documents/upload-batch` | Batch upload nhiều file (BackgroundTask + Redis tracking) | `multipart: files[]` | `{jobs: [{job_id, filename}]}` (202) |
| GET | `/documents/status/{job_id}` | Poll trạng thái xử lý upload | — | `{job_id, status, filename, error}` |

### Organizations (`/organizations`)

| Method | Path | Mô tả | Response |
|--------|------|-------|----------|
| GET | `/organizations/current` | Lấy thông tin cơ quan đầu tiên đang hoạt động | `{ten_chu_quan, ten_co_quan, viet_tat, dia_danh, chu_ky_mac_dinh}` |

### Recipient Suggestions (`/recipient-suggestions`)

| Method | Path | Mô tả | Request | Response |
|--------|------|-------|---------|----------|
| GET | `/recipient-suggestions/` | Tìm kiếm gợi ý nơi nhận | `?q=keyword` | `[{id, name}]` (sorted by frequency desc) |
| POST | `/recipient-suggestions/increment` | Tăng frequency cho 1 gợi ý (tạo mới nếu chưa có) | `?name=...` | `{ok: true}` |

### Reference Docs (`/reference-docs`)

| Method | Path | Mô tả | Request | Response |
|--------|------|-------|---------|----------|
| GET | `/reference-docs/` | Danh sách văn bản tham chiếu | `?skip, limit, loai, hieu_luc, q, visibility, sort, order` | `RefDocListResponse {items[], total, skip, limit}` — mỗi item có thêm `chunk_count: int` (0 = chưa index) |
| GET | `/reference-docs/search` | Semantic search (document-level) | `?q=text&limit=5` | `RefDocSearchResponse {items[], query}` — có field `score` |
| GET | `/reference-docs/search/chunks` | Semantic search (chunk-level) | `?q=text&limit=5` | `RefDocChunkSearchResponse {items[], query}` |
| GET | `/reference-docs/search/fulltext` | Full-text search tiếng Việt | `?q=text&limit=10` | `RefDocFTSResponse {items[], query}` — có field `rank` |
| POST | `/reference-docs/` | Tạo văn bản tham chiếu mới | `RefDocCreate` | `RefDocResponse` (201) |
| GET | `/reference-docs/{id}` | Lấy chi tiết | — | `RefDocResponse` |
| PUT | `/reference-docs/{id}` | Cập nhật toàn bộ metadata | `RefDocUpdate` | `RefDocResponse` |
| PATCH | `/reference-docs/{id}/hieu-luc` | Cập nhật trạng thái hiệu lực; validate 422 nếu giá trị sai | `{hieu_luc: "con_hieu_luc"\|"het_hieu_luc"\|"mot_phan"\|"chua", ghi_chu?: str}` | `RefDocResponse` |
| DELETE | `/reference-docs/{id}` | Xóa MinIO file trước → xóa DB record → CASCADE chunks | — | `{"status":"deleted","doc_id":"..."}` |
| POST | `/reference-docs/{id}/upload` | Upload file + trigger embedding pipeline | `multipart: file` | `RefDocResponse` |
| GET | `/reference-docs/{id}/metadata-preview` | Đọc Redis cache metadata từ LLM | — | `{doc_id, status: "ready"\|"processing"\|"not_available", fields, confidence}` |
| POST | `/reference-docs/{id}/metadata-confirm` | Xác nhận metadata, UPDATE DB, xóa Redis key | `MetadataConfirmRequest` | `RefDocResponse` |
| GET | `/reference-docs/{id}/content` | Lấy toàn bộ chunks theo chunk_index (cho OCR viewer) | — | `RefDocContentResponse {id, title, so_ki_hieu, chunks[]}` |
| GET | `/reference-docs/{id}/export` | Xuất DOCX hoặc PDF từ chunks | `?format=docx\|pdf` | Binary file (RFC 5987 filename) |
| POST | `/reference-docs/upload-batch` | Batch upload + AI metadata extraction | `multipart: files[], visibility` | `{jobs[]}` (202) |
| GET | `/reference-docs/status/{job_id}` | Poll trạng thái job | — | `{job_id, status, filename, doc_id, error}` |

### OCR (`/ocr`)

| Method | Path | Mô tả | Request | Response |
|--------|------|-------|---------|----------|
| POST | `/ocr/extract` | Detect file type → upload R2 (text_pdf) → tạo OcrJob → chạy background task; 202 ngay | `multipart: file (PDF/JPG/PNG/DOCX ≤20MB)` | `OcrJobResponse` (status=pending, có `file_type`) |
| POST | `/ocr/export` | Chuyển text → DOCX hoặc PDF (stateless, không lưu DB) | `{text, filename, format: "docx"\|"pdf"}` | Binary file |
| GET | `/ocr/jobs` | Danh sách OCR jobs của user với filter/sort | `?skip&limit&status&file_type&sort_by&sort_order` | `OcrJobListResponse {items[], total}` |
| GET | `/ocr/status/{job_id}` | Poll trạng thái nhẹ (không có text payload) | — | `OcrJobStatusResponse` (có `file_type`, `file_path`) |
| GET | `/ocr/progress/{job_id}` | Tiến độ OCR theo trang từ Redis (chỉ trong lúc scan) | — | `{job_id, current_page, total_pages, percent}` |
| GET | `/ocr/{job_id}/export/docx` | Convert PDF gốc → DOCX bảo toàn layout qua pdf2docx (chỉ text_pdf) | — | Binary DOCX |
| GET | `/ocr/{job_id}/download` | Stream PDF từ R2 — text_pdf: file gốc; scan/image/docx: PDF tạo từ OCR text | — | Binary PDF |
| GET | `/ocr/{job_id}` | Chi tiết đầy đủ kể cả text kết quả | — | `OcrJobResponse` |

**Luồng `POST /ocr/extract` (sau khi nâng cấp):**
```
validate MIME (PDF/JPG/PNG/DOCX ≤20MB)
→ detect file_type:
    DOCX MIME/extension → "text_docx"
    PDF + pdfplumber ≥ 50 chars → "text_pdf"
    PDF + pdfplumber < 50 chars → "scanned_pdf"
    image/* → "image"
→ nếu text_pdf: upload bytes lên R2 (ocr-jobs/{id}/{filename}), lưu file_path
→ create OcrJob(pending, file_type, file_path) in DB
→ dispatch background task:
    text_pdf   → _process_text_pdf(job_id, content)     [pdfplumber + LLM format]
    text_docx  → _process_text_docx(job_id, content)    [python-docx + LLM format]
    scan/image → Redis base64 → _process_ocr_job(job_id) [pytesseract + LLM format]
→ return 202

_process_ocr_job (scanned_pdf/image, 3 phases):
  Phase 1: mark "processing"
  Phase 2: decode base64 from Redis
           scanned PDF → _ocr_pdf_with_progress(): pdf2image dpi=300 → OCR page-by-page
             update Redis ocr_progress:{job_id} sau mỗi trang → xóa key khi xong
           image → PIL + pytesseract(vie→eng fallback)
           → cleanup Redis ocr_file key
           → _format_ocr_text() LLM format
  Phase 3: persist done/error result
```

### LLM (`/llm`)

| Method | Path | Mô tả | Request | Response |
|--------|------|-------|---------|----------|
| GET | `/llm/health` | Kiểm tra LLM — gọi GET /v1/models | — | `{status, model, latency_ms}` |
| POST | `/llm/test` | Test prompt đơn giản | `{prompt: str}` | `{response: str, latency_ms: int}` |
| PATCH | `/llm/config` | Cập nhật LLM_BASE_URL runtime (không cần restart) | `{llm_base_url: str}` | `{ok: true, base_url: str}` |

### RAG (`/rag`)

| Method | Path | Mô tả | Request | Response |
|--------|------|-------|---------|----------|
| GET | `/rag/health` | Trạng thái retrieval + LLM, đếm chunks/docs | — | `{retrieval, llm, total_chunks, total_documents}` |
| POST | `/rag/query` | Full RAG pipeline — yêu cầu auth | `{query, top_k=10, min_score=0.35}` | `RAGQueryResponse {answer, citations, chunks_used, confidence, citation_score, semantic_score, has_disclaimer, llm_available, fallback_mode, latency_ms}` |
| POST | `/rag/query/stream` | SSE streaming response — yêu cầu auth | `{query, top_k, min_score}` | `text/event-stream`: `chunk` → `citations` → `chunks_used` → `done` |
| POST | `/rag/chat/stream` | SSE streaming chat với RAG context + history — yêu cầu auth | `{query, doc_id, doc_context?, top_k?, min_score?}` | `text/event-stream`: `token` → `citations` → `[DONE]` |
| GET | `/rag/chat/history` | Lấy lịch sử chat theo doc_id | `?doc_id=` | `{doc_id, history[], total_turns}` |
| DELETE | `/rag/chat/history` | Xóa lịch sử chat | `?doc_id=` | `{status: "cleared", doc_id}` |

### Constants (`/constants`)

| Method | Path | Mô tả | Response |
|--------|------|-------|----------|
| GET | `/constants/nd30` | Toàn bộ hằng số thể thức NĐ 30/2020 | JSON: font_styles, page, field_positions, van_ban_types, van_ban_templates, metadata, so_kh_formats, quyen_han_ky, priority_levels, security_levels, ... |

### Health Check

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/health` | Kiểm tra trạng thái server |

---

## 6. Các service chính

### `embedding_service.py`

**Mô tả:** Load model BAAI/bge-m3 (1024 dim) một lần duy nhất khi module được import (eager-load). Model được load vào biến module-level `_model`.

**Các hàm:**
- `is_available() -> bool`: Kiểm tra model đã load thành công chưa.
- `embed_text(text: str) -> list[float]`: Embed một đoạn văn bản, trả về vector 1024 chiều đã normalize. Chạy đồng bộ (CPU-bound), cần gọi qua `asyncio.to_thread()`.
- `embed_batch(texts: list[str]) -> list[list[float]]`: Embed nhiều đoạn cùng lúc, batch_size=8, normalize=True. Ghi log thời gian.

**Cấu hình:** `MODEL_NAME = "BAAI/bge-m3"`, `EMBEDDING_DIM = 1024`, `MAX_SEQ_LENGTH = 8192`.

### `chunking_service.py`

**Mô tả:** Chia văn bản tiếng Việt thành các chunk nhỏ để embedding. Ưu tiên theo cấu trúc pháp lý, fallback sang sliding window.

**Chiến lược chunking (theo thứ tự ưu tiên):**
1. Tách theo `Điều X` (regex `_DIEU`)
2. Tách theo `Mục I/II/III` (regex `_MUC`) nếu không có Điều
3. Sliding window 512 token (~2048 ký tự), overlap 64 token (~256 ký tự) nếu không có cấu trúc
4. Nếu một section quá dài (>1024 token / 4096 ký tự), tách thêm theo `Khoản 1.` (regex `_KHOAN`)

**Context prefix:** Mỗi chunk được thêm tiền tố `[{so_ki_hieu}] [{co_quan_ban_hanh}] {heading}: {body}` để embedding mang context tài liệu.

**Hàm chính:** `chunk_document(content: str, metadata: dict) -> list[dict]`
- Trả về list `{chunk_index, content, dieu_khoan, token_count}`.

### `pipeline_service.py`

**Mô tả:** Background task xử lý embedding đầy đủ cho một văn bản tham chiếu sau khi upload file.

**Hàm chính:** `process_document_embedding(doc_id: str) -> None`

**Luồng xử lý:**
1. Lấy record `ReferenceDocument` từ DB theo `doc_id`
2. Download file bytes từ MinIO/R2 bucket (chạy trong thread)
3. Trích xuất text qua `_extract_text(data, file_type)` (viết bytes ra temp file khi OCR):
   - `"pdf"` in MIME: `pdfplumber` → nếu < 50 ký tự → **OCR fallback** (`pdf2image` convert_from_path dpi=300 → `pytesseract` lang `vie`, fallback `eng`) → `_post_process_ocr()` normalize khoảng trắng
   - `"word"/"docx"/"openxmlformats"` in MIME: `python-docx` Document() → paragraphs
   - `MIME.startswith("image/")`: `_ocr_image_bytes()` → PIL + pytesseract (vie→eng fallback) — hỗ trợ JPEG/PNG/BMP/TIFF/WebP
   - Khác: UTF-8 decode
   - Windows: `tesseract_cmd` tự động set về `C:\Program Files\Tesseract-OCR\tesseract.exe`
4. Chunk bằng `chunk_document()` với metadata `{so_ki_hieu, co_quan_ban_hanh}`
5. Embed tất cả chunks theo batch (batch_size=8)
6. Xóa các chunk cũ trong DB (idempotent)
7. Bulk insert `ReferenceDocChunk` rows với embedding
8. Lưu embedding của chunk đầu tiên lên `reference_documents.embedding` (document-level search)
9. Commit DB

**Hàm OCR:**
- `_is_scanned_pdf(text)`: `len(text.strip()) < 50`
- `_ocr_pdf(file_path)`: convert PDF → PIL images → pytesseract → `_post_process_ocr()`
- `_ocr_image_bytes(data)`: PIL Image.open(BytesIO) → pytesseract (vie→eng fallback) — mới
- `_post_process_ocr(text)`: strip blank lines, deduplicate newlines

**Ghi chú:** Tạo DB session riêng — không dùng request session. Toàn bộ I/O blocking chạy qua `asyncio.to_thread()`.

### `metadata_extraction_service.py`

**Mô tả:** Trích xuất metadata có cấu trúc từ text văn bản hành chính bằng LLM (Qwen/Qwen2.5 via vLLM). Kết quả được cache trong Redis để frontend polling.

**Các hàm:**
- `extract_metadata(text, doc_id, llm_service) -> dict`: Gửi 2000 ký tự đầu của văn bản lên LLM với system prompt tiếng Việt, nhận về JSON chứa `{so_ki_hieu, ngay_ban_hanh, co_quan_ban_hanh, nguoi_ky, trich_yeu, can_cu[], hieu_luc, tom_tat, confidence{}}`. Retry 1 lần nếu JSON parse lỗi. Luôn trả về (không raise) — trả `_empty_result()` nếu LLM fail.
- `save_metadata_preview(doc_id, metadata, redis_client)`: Ghi metadata vào Redis với key `metadata_preview:{doc_id}`, TTL 1 giờ.
- `get_metadata_preview(doc_id, redis_client) -> dict | None`: Đọc cache từ Redis. Trả `None` nếu key không tồn tại (chưa xử lý xong).

**Confidence scoring:** Mỗi field có mức `high / medium / low` do LLM tự đánh giá. Frontend `MetadataReviewCard` hiển thị badge màu xanh/vàng/đỏ tương ứng.

**Tích hợp pipeline:** `pipeline_service.py` gọi `extract_metadata()` ở **step 2** (sau extract text, trước chunk). Bước này là optional — nếu `LLM_BASE_URL` rỗng hoặc LLM lỗi, pipeline vẫn tiếp tục chunk và embed bình thường.

### `llm_service.py`

**Mô tả:** Singleton `LLMService` — client OpenAI-compatible cho vLLM. Khởi tạo một lần khi module được import. URL được lưu trong `_base_url` (string), cập nhật runtime qua `update_base_url()`.

**Các phương thức:**
- `chat(messages, temperature=0.7, max_tokens=512, json_mode=False) -> str`: Gọi POST `{_base_url}/v1/chat/completions`. Retry tối đa 3 lần với timeout 30s. Raise `ValueError` nếu `_base_url` rỗng.
- `health_check() -> dict`: Gọi GET `{_base_url}/v1/models`, đo latency, trả `{status, model, latency_ms}`.
- `update_base_url(url: str)`: Cập nhật `_base_url` ngay lập tức — không cần restart server. Dùng bởi `PATCH /llm/config`.

**Lưu ý:** `LLMService()` singleton được tạo khi module import, trước khi `.env` được đọc qua `@lru_cache`. Nếu `LLM_BASE_URL` trong `.env` rỗng (hoặc server chưa restart sau khi thêm biến), dùng `PATCH /llm/config` để cập nhật runtime.

**Bổ sung Tuần 11 — `chat_stream(messages, temperature) -> AsyncGenerator[str, None]`:**
- Dùng `httpx.AsyncClient.stream()` + `aiter_lines()` để nhận SSE từ vLLM
- Parse `data:` lines, yield từng token content string
- Payload: `"stream": True`, `"max_tokens": 512`, `"repetition_penalty": 1.15`
- Nếu `_base_url` rỗng: yield `"[LLM_OFFLINE]"` rồi return
- Lỗi network: yield `"[ERROR: ...]"` rồi return

### `rag_service.py`

**Mô tả:** Orchestrator RAG pipeline — kết hợp pgvector retrieval, CrossEncoder rerank, LLM generation và hallucination guard. Phiên bản Tuần 10 thêm hybrid search, fallback chain và system prompt v2.

**Hằng số:**
- `DEFAULT_TOP_K = 10`, `DEFAULT_MIN_SCORE = 0.35`, `DEFAULT_TOP_N_RERANK = 5`
- `MAX_CONTEXT_CHARS = 2500` (~1500 token Vietnamese, an toàn với Qwen2.5-3B max_model_len=4096)

**Các phương thức:**
- `retrieve(query, db, top_k=10, min_score=0.35) -> list[dict]`: Embed query bằng BAAI/bge-m3 → pgvector cosine distance ≤ `(1-min_score)` → JOIN `reference_documents` → **filter `WHERE hieu_luc != 'het_hieu_luc'`** (chỉ search văn bản còn hiệu lực hoặc chưa xác định) → **SELECT thêm `hieu_luc`** vào kết quả → trả danh sách chunk với `score`, `so_ki_hieu`, `document_title`, `dieu_khoan`, `hieu_luc`.
- `hybrid_search(query, db, top_k=5) -> list[dict]`: Kết hợp semantic search (min_score=0.2, top_k*2 chunk) với FTS rank ở cấp văn bản. Merge theo `hybrid_score = 0.7×semantic_score + 0.3×fts_rank`. Trả top_k chunk theo hybrid_score.
- `rerank(query, chunks, top_n=5) -> list[dict]`: CrossEncoder `ms-marco-MiniLM-L-6-v2` (lazy-load), predict scores → sort descending → top_n chunks với field `rerank_score`. Fallback về pgvector order nếu model chưa load.
- `build_context(chunks) -> str`: Format `[1] Nguồn: {so_ki_hieu} — {title}\n{dieu_khoan}:\n{content}` → cắt tại `MAX_CONTEXT_CHARS`.
- `generate(query, context, chunks) -> dict`: Gọi `llm_service.chat()` với system prompt v2 (6 quy tắc + ví dụ positive/negative, `temperature=0.05`) → `hallucination_guard.validate_full()` async → thêm ⚠️ disclaimer nếu `confidence < 0.5` → **kiểm tra `expired_sources` (`hieu_luc == "het_hieu_luc"`) trong chunks; thêm ⚠️ warning nếu có VB hết hiệu lực** → trả `{answer, citations, confidence, citation_score, semantic_score, has_disclaimer, chunks_used}`.
- `query(question, db, top_k, min_score) -> dict`: Orchestrator với fallback chain 4 bước:
  1. `retrieve(min_score=0.35)` — ngưỡng chuẩn
  2. Nếu rỗng: `retrieve(min_score=0.2)` — retry ngưỡng thấp hơn
  3. Nếu LLM offline (`not llm_service._base_url`): trả chunks trực tiếp với `fallback_mode=True`, `llm_available=False`
  4. Nếu không có chunk: trả `INSUFFICIENT_CONTEXT_MSG`, `fallback_mode=False`
  5. Bình thường: rerank → build_context → generate

**System prompt v2:** 6 quy tắc citation nghiêm ngặt + ví dụ mẫu positive/negative. `temperature=0.05` (giảm từ 0.1) để LLM ít "sáng tạo" hơn.

### `hallucination_guard.py`

**Mô tả:** Validate citations và đo độ tin cậy của câu trả lời LLM so với danh sách chunk thực tế. Phiên bản Tuần 10 bổ sung semantic similarity check và weighted confidence.

**`ValidationResult` (dataclass):**
- `is_valid: bool` — True nếu tất cả citations đều hợp lệ
- `confidence_score: float` — weighted average `0.4×citation + 0.4×semantic + 0.2×length`, range [0.0, 1.0]
- `citation_score: float` — `valid_citations / total_citations` (1.0 nếu không có citation)
- `semantic_score: float` — cosine similarity giữa embedding answer và embedding chunks (max qua tất cả chunks)
- `valid_citations: list[str]` — danh sách citation đã được xác nhận
- `invalid_citations: list[str]` — danh sách citation không tìm thấy trong chunks
- `has_disclaimer: bool` — True nếu `confidence_score < 0.5`
- `message: str` — "OK" nếu ≥0.7, "Cần kiểm tra lại" nếu ≥0.4, "Độ tin cậy thấp" nếu <0.4

**Các hàm:**
- `validate(answer, chunks) -> ValidationResult` (sync): Giữ lại để tương thích ngược. Chỉ tính `citation_score`, `semantic_score=0.0`. Parse `[N]` kiểm tra N ≤ len(chunks); parse `[Nguồn: xxx]` so với `so_ki_hieu`/`document_title`.
- `semantic_similarity_check(answer, chunks) -> float` (async): Embed `answer[:500]` qua `asyncio.to_thread(embed_text)`, tính cosine với từng chunk embedding (cũng embed chunk[:500]) → trả max similarity.
- `validate_full(answer, chunks) -> ValidationResult` (async): Gọi `validate()` lấy citation_score → gọi `semantic_similarity_check()` lấy semantic_score → `length_score = min(1.0, len(answer)/200)` → `confidence = 0.4×citation + 0.4×semantic + 0.2×length`.

### `chat_history_service.py`

**Mô tả:** Quản lý lịch sử hội thoại chat AI theo `(user_id, doc_id)`. Lưu trữ trong Redis (không dùng DB) vì history là session data, không cần persist lâu dài.

**Hằng số:** `MAX_HISTORY_TURNS = 20`, `HISTORY_TTL = 86400` (24h). Key pattern: `chat_history:{user_id}:{doc_id}`.

**Các hàm:**
- `get_history(user_id, doc_id, redis, last_n=5) -> list[dict]`: Đọc key → deserialize JSON → trả `history[-(last_n*2):]` (last_n turns = last_n×2 messages). Trả `[]` nếu key không tồn tại hoặc lỗi.
- `save_turn(user_id, doc_id, user_msg, assistant_msg, redis) -> None`: Append 2 messages (`{"role":"user",...}` + `{"role":"assistant",...}`) → cắt nếu vượt `MAX_HISTORY_TURNS*2` → `SETEX` với TTL 24h.
- `clear_history(user_id, doc_id, redis) -> None`: `DEL` key. Silently ignore lỗi.

### `pdf_service.py`

**Mô tả:** Tạo PDF từ dữ liệu `Nd30Data` (JSON) sử dụng xhtml2pdf + ReportLab với font DejaVu Serif (hỗ trợ tiếng Việt Unicode).

**Hàm chính:** `generate_pdf(data: dict) -> bytes` (async, chạy `_write_pdf` trong thread)

**Các hàm nội bộ:**
- `_ensure_fonts()`: Load 4 variant DejaVu Serif từ `backend/app/static/fonts/`, đăng ký với ReportLab, cache base64 URI.
- `_build_css(font)`: Tạo CSS A4 với lề `25mm 20mm 25mm 30mm` theo NĐ30.
- `_build_body(data)`: Render HTML bố cục 2 cột: cơ quan + quốc hiệu/địa danh, tên loại + trích yếu, căn cứ, nội dung, nơi nhận + chữ ký.
- `_patch_xhtml2pdf_font_loader()`: Patch xhtml2pdf để đọc font từ `BytesIO` thay vì file tạm (workaround lỗi Windows path).

**Bố cục văn bản được render:** 18 loại văn bản (`NQ`, `QĐ`, `CT`, `CV`, `GM`, `GGT`, `GNP`, ...) với logic `has_type_name` và `has_kinh_gui`.

---

## 6b. Benchmark Results (Tuần 10)

### Thiết lập benchmark

- **Script:** `backend/scripts/benchmark_rag.py` — 10 test cases chuẩn, lưu kết quả vào `benchmark_results.json`
- **LLM:** Qwen2.5-3B-Instruct qua Cloudflare Tunnel
- **Dữ liệu:** Toàn bộ reference docs đã được embed trong DB (kho hiện tại)
- **Ngày chạy:** 2026-05-23

### Kết quả Tuần 10

| Chỉ số | Giá trị |
|--------|---------|
| Avg confidence | 0.645 |
| Avg citation score | 0.750 |
| Avg semantic score | 0.580 |
| Has result (có chunk trả về) | 10/10 |
| Keyword hits | 4/10 (*) |
| Fallback mode | 0/10 |

(*) Keyword hits thấp do test case dùng ASCII không dấu, trong khi câu trả lời LLM trả về tiếng Việt có dấu Unicode. Không phản ánh chất lượng thực — xem Issue 12.

### So sánh Tuần 9 vs Tuần 10

| Chỉ số | Tuần 9 | Tuần 10 | Thay đổi |
|--------|--------|---------|---------|
| Confidence scoring | Chỉ dựa citation format (thường =1.0) | Weighted: citation 40% + semantic 40% + length 20% | Thực tế hơn |
| Avg confidence | ~1.0 (ảo) | 0.645 (thực) | Chính xác hơn |
| LLM offline | Trả lỗi / màn hình trắng | Fallback mode: trả chunks trực tiếp | 10/10 có kết quả |
| Retry mechanism | Không có | retry min_score 0.35→0.2 | 100% has_result |
| Hybrid search | Không có | 0.7×semantic + 0.3×FTS | Precision cao hơn |
| Disclaimer | Không có | ⚠️ tự động khi confidence <0.5 | Minh bạch hơn |

---

## 7. Luồng nghiệp vụ

### Luồng 1: Đăng ký / Đăng nhập

```
1. User điền form → POST /api/v1/auth/register {email, full_name, password}
   → Backend hash password bcrypt → INSERT users
   → Frontend redirect /login

2. User điền form → POST /api/v1/auth/login (form-encoded: username=email)
   → Backend verify password → create_access_token(user.id) [HS256, 30 phút]
   → Frontend lưu token vào cookie "access_token" (expires 1 ngày)
   → Redirect /dashboard

3. Mọi request sau: axios interceptor tự thêm Authorization: Bearer <token>
4. Nếu 401: interceptor xóa cookie → redirect /login
```

### Luồng 2: Soạn thảo văn bản NĐ 30

```
1. User click "Soạn thảo mới" → /dashboard/documents/new
2. DocumentEditor render (SSR=false) → Nd30Document component
3. Khi isNew=true:
   - organizationApi.getCurrent() → auto-fill coQuanChuQuan, coQuanBanHanh, diaDanh, chữ ký
   - documentApi.nextNumber(loai) → tính soKyHieu tự động
   - Ngày tháng khởi tạo theo ngày hiện tại
4. User gõ nội dung (TipTap editor cho canCu và noiDung)
5. Auto-save sau 30 giây nếu có thay đổi (useAutosave hook)
   - Nếu chưa có docId: POST /documents/ → lưu docId mới
   - Nếu đã có docId: PATCH /documents/{id}
   - Content được serialize: JSON.stringify({version: "nd30", ...Nd30Data})
6. Ctrl+Shift+P hoặc nút "Xem trước" → DocumentPreviewPaged (read-only A4)
```

### Luồng 3: Upload văn bản tham chiếu vào kho

```
1. User vào /dashboard/reference-docs → click "Thêm văn bản"
2. UploadModal hiển thị: form metadata + drag-drop zone
3. Điền: title/trich_yeu (bắt buộc), loai_van_ban (bắt buộc), co_quan_ban_hanh (bắt buộc)
   + Tùy chọn: so_ki_hieu, ngay_ban_hanh, nguoi_ky, hieu_luc, tu_khoa
4. Chọn file (PDF, DOCX, TXT)
5. Click "Thêm văn bản":
   a. POST /reference-docs/ → tạo record trong DB (chưa có file)
   b. POST /reference-docs/{id}/upload → upload file lên MinIO bucket "reference-docs"
      → object_name = "{user_id}/{doc_id}/{uuid}_{filename}"
   c. Update record: file_path, file_size, file_type
   d. Kick off background task: process_document_embedding(doc_id)
```

### Luồng 4: Embedding và chunk tự động

```
(BackgroundTask — chạy sau khi HTTP response đã được gửi về client)

1. Lấy ReferenceDocument record từ DB
2. Download file bytes từ MinIO (trong thread)
3. Trích xuất text:
   - PDF: pdfplumber.open() → page.extract_text() → nếu < 50 ký tự: OCR fallback (pdf2image → pytesseract lang vie/eng)
   - DOCX: python-docx Document() → [p.text for p in doc.paragraphs]
   - Khác: data.decode("utf-8")
4. chunk_document(text, {so_ki_hieu, co_quan_ban_hanh}):
   - Tìm Điều → Mục → sliding window
   - Thêm context prefix: "[{so_ki_hieu}] [{co_quan}] {heading}: ..."
5. Embed chunks (batch_size=8 qua BAAI/bge-m3) → list[vector(1024)]
6. DELETE cũ: DELETE FROM reference_doc_chunks WHERE document_id = doc_id
7. INSERT mới: bulk add ReferenceDocChunk rows
8. UPDATE reference_documents SET embedding = embeddings[0]
9. db.commit()
```

### Luồng 5: Tìm kiếm (FTS tiếng Việt + Semantic Search)

**Full-text search (`GET /reference-docs/search/fulltext?q=ho tich`):**
```
1. Tách query thành terms: ["ho", "tich"] → tsquery = "ho & tich"
2. SQL: to_tsquery('simple', unaccent("ho & tich"))
3. WHERE search_vector @@ tsq_expr (sử dụng GIN index)
4. ORDER BY ts_rank DESC
5. Trả về RefDocFTSResponse với field rank
```

**Semantic search document-level (`GET /reference-docs/search?q=...`):**
```
1. Kiểm tra embedding model available
2. embed_text(q) → vector(1024) qua asyncio.to_thread
3. SQL: SELECT ..., (1 - embedding <=> query_vector) AS score
   WHERE embedding IS NOT NULL
   ORDER BY embedding <=> query_vector ASC LIMIT 5
4. Trả về RefDocSearchResponse với field score (0.0 → 1.0)
```

**Semantic search chunk-level (`GET /reference-docs/search/chunks?q=...`):**
```
1. embed_text(q) → vector(1024)
2. JOIN reference_doc_chunks ⋈ reference_documents
3. ORDER BY chunk.embedding <=> query_vector ASC
4. Trả về RefDocChunkSearchResponse: document_title, so_ki_hieu, dieu_khoan, content_preview (200 chars), score
```

### Luồng 6: Tra cứu AI (RAG Query)

```
1. User vào /dashboard/rag-search → nhập câu hỏi → Ctrl+Enter hoặc nút Tìm kiếm
2. Frontend POST /api/v1/rag/query {query, top_k=10, min_score=0.35}
3. Backend RAGService.query() — fallback chain 4 bước:
   a. retrieve(min_score=0.35): embed_text(query) → pgvector cosine search JOIN reference_documents
   b. Nếu rỗng: retry retrieve(min_score=0.2) — ngưỡng thấp hơn
   c. Nếu LLM offline (llm_service._base_url rỗng):
      → trả chunks trực tiếp, fallback_mode=True, llm_available=False
   d. Nếu không có chunk sau retry:
      → trả INSUFFICIENT_CONTEXT_MSG, chunks_used=[], confidence=0.0
   e. Bình thường:
      - rerank(): CrossEncoder.predict([(query, chunk.content)]) → sort desc → top 5
      - build_context(): format [1][2]... cắt tại 2500 ký tự
      - generate(): system prompt v2 (6 quy tắc + examples) + context
        → llm_service.chat(temperature=0.05, max_tokens=512)
        → hallucination_guard.validate_full() async (semantic+citation+length)
        → thêm ⚠️ disclaimer nếu confidence < 0.5
4. Trả RAGQueryResponse {answer, citations, chunks_used, confidence,
   citation_score, semantic_score, has_disclaimer, llm_available, fallback_mode, latency_ms}
5. Frontend:
   - Nếu fallback_mode: hiển thị banner cam + danh sách văn bản liên quan (không có badge citation)
   - Nếu has_disclaimer: hiển thị banner vàng cảnh báo độ tin cậy thấp
   - Bình thường: parse [1][2] → clickable citation badges
   - ConfidenceMeter: progress bar màu xanh/vàng/đỏ, hiển thị citation% và semantic%
   - CopyButton: copy answer + sources ra clipboard
   - Right panel (40%): CitationCard với so_ki_hieu, dieu_khoan, content_preview, score
   - LLM status badge polling /rag/health mỗi 60 giây
```

### Luồng 7: Chat AI trong Editor

```
1. User nhấn "Trợ lý AI" (MessageSquare icon) trong toolbar DocumentEditor
2. chatOpen state → true
3. ChatPanel slide ra bên phải (translate-x-0)
   Editor outer div thêm mr-[380px] → thu hẹp, không bị che
4. User nhập câu hỏi vào textarea → Ctrl+Enter hoặc nút Send
5. ChatPanel gọi chatApi.streamChat():
   - fetch POST /api/v1/rag/chat/stream
   - Headers: Authorization Bearer, Accept: text/event-stream, X-Accel-Buffering: no
   - Body: {query, doc_id, doc_context}
   - doc_context = text extract từ dataRef.current (loaiVanBan, soKyHieu, trichYeu, canCu, noiDung)
6. Backend POST /rag/chat/stream:
   a. retrieve(min_score=0.35) → retry(0.2) nếu rỗng
   b. rerank(top_n=5) nếu có chunks
   c. build_context(reranked)
   d. get_history(user_id, doc_id, redis, last_n=5)
   e. Build messages: [system_prompt] + [doc_context?] + [rag_context?] + history + [user_query]
   f. llm_service.chat_stream(messages, temperature=0.05)
      → httpx stream → yield từng token SSE
   g. Sau stream: gửi citations event, save_turn() vào Redis
7. Frontend nhận SSE:
   - type=token: append vào assistant bubble real-time
   - type=citations: hiện citation mini cards dưới bubble
   - [DONE]: isStreaming=false
8. User click "Chèn vào văn bản" → copy clipboard → toast "Ctrl+V để dán"
9. Multi-turn: lần hỏi tiếp theo tự động include 5 turns gần nhất từ Redis
```

### Luồng 8: Vòng đời văn bản (Data Lifecycle)

```
1. Upload VB → chunk → embed → lưu kho (hieu_luc = "chua" mặc định)

2. VB còn hiệu lực → PATCH /hieu-luc {"hieu_luc": "con_hieu_luc"}
   → RAG search bình thường (không bị filter)

3. VB hết hiệu lực:
   PATCH /hieu-luc {"hieu_luc": "het_hieu_luc", "ghi_chu": "Thay thế bởi QĐ xx/2026"}
   → RAG tự động exclude khỏi retrieve() qua WHERE filter SQL
   → VB vẫn còn trong kho để tra cứu lịch sử (không bị xóa)
   → Nếu chunk nào lọt qua (edge case): generate() thêm ⚠️ warning

4. Xóa hẳn:
   DELETE /reference-docs/{id}
   → Xóa MinIO file trước (nếu lỗi: log warning, tiếp tục)
   → Xóa DB record → CASCADE tự động xóa reference_doc_chunks + embeddings
   → Trả {"status":"deleted","doc_id":"..."}

5. VB thay thế nhau (tuần 17+):
   document_relations table (replaces/amends)
   → RAG ưu tiên VB còn hiệu lực
   → Cảnh báo khi cite VB đã bị thay thế (xem Issue 16)
```

### Luồng 9: Xuất PDF

**Phương án A — Puppeteer (Next.js API Route, trả về pixel-perfect):**
```
1. User click "Xuất PDF" trong DocumentEditor
2. Frontend fetch POST /api/export/pdf {docId}
3. Next.js route.ts (server-side):
   a. Đọc cookie access_token
   b. Puppeteer launch headless browser
   c. Gắn cookie auth → goto /print/{docId} (SSR page)
   d. /print/{id}/page.tsx: fetch document từ backend → parse content → render DocumentPreview
   e. page.pdf({format: "A4", margin: {top:"25mm", right:"20mm", bottom:"25mm", left:"30mm"}})
   f. Return PDF buffer
4. Frontend tạo Blob URL → a.click() → download
```

**Phương án B — xhtml2pdf (Backend, nhanh hơn):**
```
1. POST /api/v1/documents/{id}/export/pdf
2. documents.py: parse document.content → JSON data
3. pdf_service.generate_pdf(data):
   a. _ensure_fonts() → load DejaVu Serif từ static/fonts/
   b. _build_css() → CSS @page A4 25/20/25/30mm
   c. _build_body(data) → HTML 2-column header + body + footer
   d. xhtml2pdf.pisa.CreatePDF() → PDF bytes
4. Return Response(content=pdf_bytes, media_type="application/pdf")
   Filename: {soKyHieu}_{title}.pdf
```

---

## 8. Biến môi trường

### File `.env.example` (root)

| Biến | Giá trị mặc định | Mô tả |
|------|-----------------|-------|
| `DATABASE_URL` | `postgresql://postgres:password@localhost:5432/vanban_ai` | Kết nối PostgreSQL |
| `REDIS_URL` | `redis://localhost:6379` | Kết nối Redis |
| `MINIO_ENDPOINT` | `localhost:9000` | MinIO endpoint (không có http://) |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO access key |
| `MINIO_SECRET_KEY` | `minioadmin` | MinIO secret key |
| `MINIO_BUCKET_NAME` | `vanban-ai` | Bucket chính cho tài liệu |
| `MINIO_USE_SSL` | `false` | Dùng HTTPS cho MinIO |
| `SECRET_KEY` | `your-secret-key-change-in-production` | JWT signing key (HS256) |
| `DEBUG` | `true` | Bật SQL echo và debug mode |
| `ALLOWED_ORIGINS` | `["http://localhost:3000"]` | CORS allowed origins (JSON array) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | JWT TTL (phút) |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `LLM_BASE_URL` | _(rỗng)_ | URL vLLM Cloudflare Tunnel, vd: `https://xxx.trycloudflare.com` |

### Frontend (`.env.local`)

| Biến | Giá trị mặc định | Mô tả |
|------|-----------------|-------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Base URL của Backend API |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Base URL của Frontend (dùng cho Puppeteer) |
| `NEXTAUTH_URL` | `http://localhost:3000` | Alternate app URL cho Puppeteer |

### Ghi chú MinIO

Backend tự động tạo 2 bucket khi khởi động:
- `vanban-ai`: lưu file đính kèm tài liệu soạn thảo
- `reference-docs`: lưu file PDF/DOCX của văn bản tham chiếu

---

## 9. Hướng dẫn cài đặt dev

### Yêu cầu hệ thống

- Python 3.12+
- Node.js 20+
- PostgreSQL 15+ với extension `pgvector`, `unaccent`, `pg_trgm`
- Redis 7+
- MinIO (tự host hoặc cloud)
- ~3GB RAM (để load model BAAI/bge-m3)
- GPU tùy chọn (tăng tốc embedding)

### Cài đặt Backend

```bash
# 1. Tạo virtual environment
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# 2. Cài dependencies
pip install -r requirements.txt

# 3. Tạo file .env (copy từ root .env.example)
cp ../.env.example .env
# Chỉnh sửa DATABASE_URL, MINIO_*, SECRET_KEY

# 4. Chạy migrations
alembic upgrade head

# 5. Download fonts (cho PDF export)
python scripts/download_fonts.py  # nếu có

# 6. Khởi động server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Lưu ý:** Lần đầu khởi động, model BAAI/bge-m3 (~1.5GB) sẽ được download tự động từ HuggingFace Hub. Cần kết nối internet.

### Cài đặt Frontend

```bash
cd frontend
npm install

# Tạo .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
echo "NEXT_PUBLIC_APP_URL=http://localhost:3000" >> .env.local

# Khởi động dev server
npm run dev
```

### Khởi động PostgreSQL + MinIO + Redis (Docker)

```bash
# PostgreSQL với pgvector
docker run -d --name postgres-vanban \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=vanban_ai \
  -p 5432:5432 \
  pgvector/pgvector:pg16

# Redis
docker run -d --name redis-vanban \
  -p 6379:6379 redis:7-alpine

# MinIO
docker run -d --name minio-vanban \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  -p 9000:9000 -p 9001:9001 \
  minio/minio server /data --console-address ":9001"
```

### Khởi động LLM (Google Colab)

Mỗi lần làm việc cần khởi động Colab trước khi dùng tính năng RAG và metadata extraction:

1. Mở `notebooks/vllm_qwen25_colab.ipynb`
2. Runtime → Change runtime type → **T4 GPU**
3. Chạy Cell 1: `pip install vllm -q` (chờ ~3 phút)
4. Chạy Cell 2: Khởi động vLLM server Qwen2.5-3B-Instruct  
   Chờ log: `Application startup complete`
5. Chạy Cell 3: Cloudflare Tunnel → copy `PUBLIC_URL` (`https://xxx.trycloudflare.com`)
6. Cập nhật URL trong backend:
   ```
   PATCH http://localhost:8000/api/v1/llm/config
   {"llm_base_url": "https://xxx.trycloudflare.com"}
   ```
7. Kiểm tra: `GET /api/v1/rag/health` → `"llm": "ok"`

> **Lưu ý:** Tunnel tự động expire sau ~2h idle. Khi `llm: "error"` → restart Cell 3 → copy URL mới → PATCH lại.

### Lệnh khởi động tóm tắt

| Thành phần | Lệnh | Port |
|-----------|------|------|
| Backend (local) | `uvicorn app.main:app --reload` | 8000 |
| Backend (Railway) | `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1` | $PORT (8080) |
| Frontend | `npm run dev` | 3000 |
| Swagger UI | `http://localhost:8000/docs` | 8000 |

---

## 10. Ghi chú kỹ thuật

### Quyết định kiến trúc quan trọng

**1. Lazy-load embedding model (background task)**
Model BAAI/bge-m3 được load trong asyncio background task sau khi startup hoàn thành (không phải module-level hay lifespan blocking). Lý do: Railway healthcheck ping `/health` ngay sau port open — nếu model load trong startup thì healthcheck timeout. Trade-off: request RAG đầu tiên trong ~30s sau startup sẽ nhận 503 "Model đang khởi động". Frontend nên check `/ready` trước khi enable RAG features.

**2. Embedding chạy trong thread**
Mọi cuộc gọi `embed_text()` và `embed_batch()` đều được wrap bằng `asyncio.to_thread()` để không block event loop FastAPI (model inference là CPU-bound).

**3. Content lưu dạng JSON**
`document.content` là JSON string với schema `{version: "nd30", loaiVanBan, coQuanChuQuan, ..., noiDung, canCu}`. Sử dụng `version: "nd30"` để phân biệt với các format cũ. Cả `canCu` và `noiDung` là HTML từ TipTap editor.

**4. Hai phương án xuất PDF**
- **Puppeteer** (Next.js `/api/export/pdf`): Render HTML qua browser thật → PDF chính xác về font và layout. Chậm hơn (~3-5 giây). Cần Puppeteer/Chromium.
- **xhtml2pdf** (Backend `POST /documents/{id}/export/pdf`): Nhanh hơn, không cần browser. Dùng DejaVu Serif + workaround Windows path cho xhtml2pdf font loader.

**5. FTS tiếng Việt không dùng dictionary**
Dùng `to_tsvector('simple', unaccent(...))` thay vì dictionary tiếng Việt (chưa tồn tại trong PostgreSQL mặc định). `unaccent` bỏ dấu để match "ho tich" với "Hộ tịch".

**6. chunk_index dùng cho ordering, không phải unique key**
Khi re-process một văn bản (upload file mới), hệ thống DELETE toàn bộ chunk cũ trước khi INSERT mới (idempotent). `chunk_index` là thứ tự trong document, bắt đầu từ 0.

**7. Document embedding vs Chunk embedding**
`reference_documents.embedding` lưu embedding của **chunk đầu tiên** (thường là phần header/mở đầu), dùng cho document-level search nhanh. `reference_doc_chunks.embedding` là chunk-level search chính xác hơn.

**8. Auto-save 30 giây**
`useAutosave` hook trong frontend tự động save sau 30 giây idle. Nếu chưa có `docId` (văn bản mới), sẽ gọi `POST /documents/` và lưu `docId` vào state.

**9. JWT lưu trong cookie**
Token lưu trong cookie `access_token` (expires: 1 ngày) thay vì localStorage để cho phép Next.js server component đọc trong `cookies()` (phục vụ Puppeteer PDF export và `/print/[id]` page).

**10. MAX_CONTEXT_CHARS = 2500 (an toàn cho Qwen 3B)**
Qwen2.5-3B-Instruct có `max_model_len=4096` token. Vietnamese ~1.5 chars/token → 2500 chars ≈ 1700 token context + 512 token output ≈ 2200 token tổng, đủ an toàn. Tăng lên 4000 chars với model 8K context trở lên.

**11. LLMService singleton không đọc lại .env sau khi tạo**
`Settings` dùng `@lru_cache` → singleton được tạo lần đầu khi module import. Nếu `LLM_BASE_URL` chưa có trong `.env` tại thời điểm server start, `llm_service._base_url` sẽ rỗng. Dùng `PATCH /llm/config` để cập nhật runtime mà không cần restart.

**12. Reranker lazy-load để không block startup**
CrossEncoder `ms-marco-MiniLM-L-6-v2` (~70MB) được lazy-load khi request RAG đầu tiên thay vì eager-load khi startup — tránh tăng thêm ~10 giây thời gian khởi động. Sau lần đầu, model được cache trong `_reranker` module-level variable.

**13. Weighted confidence thay vì chỉ dựa citation format**
Tuần 9, `confidence_score = valid_citations / total_citations` — thường bằng 1.0 vì LLM không có citation thì không có citation invalid. Tuần 10 dùng `0.4×citation + 0.4×semantic + 0.2×length` để phản ánh thực chất: answer ngắn hoặc không liên quan đến context sẽ có confidence thấp dù không vi phạm citation format.

**14. Fallback chain 4 bước thay vì error khi LLM offline**
Trước: endpoint có `if not llm_service._base_url: return error`. Sau: service xử lý hoàn toàn — retry threshold thấp đảm bảo 100% has_result, nếu LLM offline vẫn trả được danh sách chunk liên quan với flag `fallback_mode=True`. Frontend hiển thị banner cam thay vì màn hình trắng.

**15. Hybrid search score = 0.7×semantic + 0.3×FTS**
Tỷ lệ 7:3 dựa trên thực nghiệm: semantic search bge-m3 cho precision cao với câu hỏi tự nhiên, FTS giúp khi query chứa tên văn bản/số ký hiệu chính xác (ví dụ "30/2020/NĐ-CP"). Merge ở cấp document (không phải chunk) để tránh trùng lặp: mỗi document chỉ xuất hiện một lần với chunk có score cao nhất.

**16. SSE client dùng fetch thay axios**
`axios` không hỗ trợ `ReadableStream` natively — response body bị buffer thành một lần. `fetch()` API chuẩn trình duyệt cho phép đọc `response.body.getReader()` từng chunk. `chatApi.streamChat()` dùng `fetch` + `TextDecoder` + buffer leftover để parse SSE lines chính xác, kể cả khi một SSE event bị chia thành nhiều TCP chunk.

**17. Chat history trong Redis thay vì DB**
History là session data ngắn hạn — không cần truy vấn phức tạp, không cần join, không cần index. Redis `SETEX` với TTL 24h đơn giản và đủ nhanh. Không tạo thêm bảng DB → migration đơn giản hơn. Nếu Redis restart, history mất — acceptable vì chat session tạm thời.

**19. DELETE MinIO trước DB (Tuần 11+)**
Thứ tự: MinIO `remove_object()` → `db.delete()` → `db.commit()` (CASCADE xóa chunks). Nếu ngược lại: DB delete thành công nhưng MinIO lỗi → orphan file không thể xóa vì `file_path` đã mất. MinIO lỗi → log warning, vẫn tiếp tục xóa DB (acceptable: orphan file nhỏ hơn orphan record trong DB). Thêm `await db.commit()` vì DELETE không auto-commit qua FastAPI session.

**20. RAG filter `hieu_luc != "het_hieu_luc"` ở tầng SQL (Tuần 11+)**
Văn bản hết hiệu lực vẫn giữ trong DB để: tra cứu lịch sử, audit trail, tham chiếu khi cần biết quy định cũ. Nhưng không được cite trong câu trả lời RAG mới. Filter ở tầng SQL (không phải application layer) — hiệu quả hơn, không tải chunk không cần thiết lên memory trước khi lọc. Các giá trị `"chua"`, `"con_hieu_luc"`, `"mot_phan"` đều được phép search bình thường.

**18. `repetition_penalty=1.15` fix Qwen2.5-3B loop**
Qwen2.5-3B-Instruct hay lặp vô hạn khi context dài (>2000 token). `repetition_penalty > 1.0` phạt token đã xuất hiện trong output, giảm xác suất chọn lại. Giá trị 1.15 đủ mạnh để phá loop nhưng không làm câu văn bị lạ. Kết hợp với `max_tokens=512` để đảm bảo terminate trong mọi trường hợp.

**21. Editor 3 cột layout (Tuần 13)**
Layout `grid-cols-[256px_1fr_320px]`. Cột trái: `SourcesPanel` (document_sources). Cột giữa: `Nd30Document` + shared TipTap toolbar (1 toolbar track `activeEditor`). Cột phải: `RightPanel` tabs Tools/Chat. Mobile: ẩn cột trái/phải, toggle button. Editor route dùng layout riêng không có sidebar (fixed inset-0 z-50).

**22. Transformers server thay vLLM (Tuần 13)**
vLLM 0.21.0 compiled cho CUDA 13, Colab T4 chạy CUDA 12.8 → `ImportError libcudart.so.13`. Giải pháp: dùng `transformers AutoModelForCausalLM` + FastAPI OpenAI-compatible server. API format giống hệt vLLM → backend không đổi. Model cache trong Google Drive `HF_HOME`.

**23. Railway healthcheck — non-blocking /health endpoint**
Railway ping `/health` ngay sau khi port open. Nếu endpoint này gọi DB, Redis, hay load model → timeout. `/health` chỉ trả `{"status": "ok"}` ngay lập tức. Model bge-m3 được load trong asyncio background task (không block startup). Thêm `/ready` endpoint để check model đã load xong chưa — trả 503 nếu chưa.

**24. Supabase Transaction pooler + NullPool**
Supabase Transaction pooler (PgBouncer mode transaction, port 6543) không hỗ trợ prepared statements vì mỗi transaction có thể chạy trên connection vật lý khác nhau. Hai fix bắt buộc:
1. `statement_cache_size=0` trong connect_args → tắt asyncpg prepared statement cache
2. `poolclass=NullPool` trong create_async_engine → tắt client-side connection pool (Transaction pooler đã có pool server-side)
Username trong pooler URL có dạng `postgres.PROJECT_REF` (không phải `postgres`) — đây là SNI identifier cho pooler.

**25. Cloudflare R2 thay MinIO**
R2 tương thích S3 API → dùng boto3 thay MinIO client. Không cần Docker MinIO local — R2 accessible qua HTTPS từ mọi môi trường. Endpoint format: `https://ACCOUNT_ID.r2.cloudflarestorage.com`. Phải dùng `signature_version=s3v4` và `region_name="auto"`. Reference docs upload vào bucket `vanban-ai` với key prefix `reference-docs/` (không tạo bucket riêng). `ensure_bucket_exists()` là no-op vì bucket đã tạo sẵn trên Cloudflare dashboard — gọi `create_bucket` với R2 sẽ bị lỗi.

**26. SSL config cho asyncpg remote connection**
asyncpg không đọc `?ssl=require` hay `?sslmode=require` trong connection string — phải dùng `connect_args={"ssl": ssl_context}`. Để bypass self-signed cert của Supabase pooler: `ssl_context.check_hostname = False` + `ssl_context.verify_mode = ssl.CERT_NONE`. Không dùng `ssl="require"` string — cần object `ssl.SSLContext` thực sự.

**27. Stable array reference tránh React infinite loop (Tuần 14+)**
`useQuery` trả về `data = undefined` khi query bị disabled → destructuring `const { data: sources = [] }` tạo `[]` mới mỗi render → `useEffect([sources, ...])` thấy deps thay đổi mỗi render → `setSourceIds([])` → re-render → lặp vô tận → React error #185. **Fix 2 lớp:** (1) `const EMPTY_SOURCES: RefDoc[] = []` ở module level làm default ổn định; (2) `handleSourcesChange` trong `DocumentEditor` dedup bằng `prev.every((id, i) => id === ids[i])` — skip setState nếu values giống nhau dù reference khác.

**28. chunk_count batch query thay N+1 (Tuần 14+)**
`list_ref_docs` trả về danh sách docs; mỗi doc cần biết có bao nhiêu chunk đã embed. Tránh N+1 bằng: lấy danh sách `doc_ids` → một query `SELECT document_id, COUNT(*) FROM reference_doc_chunks WHERE document_id IN (...) GROUP BY document_id` → build `chunk_map: {id: count}` → assign trong list comprehension. Không dùng correlated subquery vì query builder khó thêm column sau khi đã build WHERE chain.

**29. SourcePickerModal guard + catch (Tuần 14+)**
`handleAdd` trong `SourcePickerModal` trước đây không có `catch` block — nếu `documentSourcesApi.add()` reject (ví dụ docId không hợp lệ hoặc network lỗi), promise unhandled propagate lên React 18 error boundary → "Application error: a client-side exception". **Fix:** thêm guard `if (!documentId || documentId === "new-doc") return` + `catch(e) { console.error(...) }` để lỗi không leo lên boundary. Tương tự, `handleStartUpload` trong `SourcesPanel` thêm guard `if (isNewDoc) { toast(...); return }` làm defense in depth.

**30. base64 cho binary trong Redis (Tuần 14+)**
Redis client (`redis.asyncio`) được khởi tạo với `decode_responses=True` — mọi giá trị lưu/đọc đều là `str`, không phải `bytes`. Khi OCR endpoint cần cache file bytes tạm trong Redis: `base64.b64encode(content).decode()` khi set, `base64.b64decode(raw)` khi get (`b64decode` chấp nhận `str` trực tiếp). Kích thước tối đa 20MB → base64 ~27MB, vẫn nằm trong Redis memory limit thông thường. TTL 1h đủ cho background task hoàn thành; cleanup ngay sau OCR xong.

**31. OCR async job — 3-phase DB session (Tuần 14+)**
Background task `_process_ocr_job` dùng 3 `AsyncSessionLocal` riêng biệt thay vì 1 session xuyên suốt: Phase 1 (mark processing), Phase 2 (OCR work, không cần DB), Phase 3 (persist result). Lý do: nếu Phase 2 ném exception và session đang ở trạng thái error/rollback, Phase 3 vẫn cần một session sạch để ghi error_msg vào DB. Pattern tương tự `pipeline_service.py` — background task luôn tạo session riêng, không dùng request session.

**32. Content-Disposition RFC 5987 cho Vietnamese filename (Tuần 14+)**
Starlette encode header values bằng latin-1. Tên file tiếng Việt (ví dụ "Đề án...") chứa ký tự ngoài latin-1 range → `UnicodeEncodeError` khi tạo Response. **Fix:** dual-filename pattern `filename="vanban.docx"; filename*=UTF-8''<percent-encoded>` — ASCII fallback cho client cũ, RFC 5987 URI-encoded cho browser hiện đại. Dùng `urllib.parse.quote(filename, safe="")` để encode. Áp dụng cho tất cả endpoint export (reference_docs + ocr).

**33. OCR LLM formatting — non-fatal step (Tuần 14+)**
Sau khi OCR xong, `_format_ocr_text(raw_text, filename)` gọi `llm_service.chat(temperature=0.1, max_tokens=4000)` với system prompt tái cấu trúc văn bản tiếng Việt. Input cap 8000 ký tự để tránh timeout Groq. Nếu LLM lỗi (offline, rate-limit, timeout), fallback về `_basic_format()` (normalize whitespace, tách paragraph) — không làm fail toàn bộ OCR job. Kết quả lưu vào `ocr_jobs.formatted_text`; frontend dùng `formatted_text || text` (raw OCR làm fallback). Test thực tế với Mau-CT01-tt53.pdf: Groq tách đúng quốc hiệu, tiêu đề, mục 1-10 thành dòng riêng — `Khác nhau: True`.

**35. OCR file_type routing — 4 nhánh background task (Tuần 14+)**
`POST /ocr/extract` detect file_type trước khi tạo OcrJob và dispatch task. Mỗi nhánh tối ưu riêng: `text_pdf` upload file lên R2 ngay trong request (đồng bộ) vì cần `file_path` cho `/download` endpoint sau này — tốn ~200ms nhưng chấp nhận được; task chỉ cần extract text (không OCR, không Redis cache). `scanned_pdf`/`image` dùng Redis base64 cache vì pytesseract có thể mất 30-120s mỗi trang — không block request. `text_docx` pass bytes trực tiếp vào task vì python-docx nhanh, không cần R2 (không có download use case). Không có nhánh nào dùng cả Redis lẫn R2 — tránh double storage overhead.

**36. react-pdf v7 + workerSrc CDN (Tuần 14+)**
react-pdf v10 dùng pdfjs-dist v4 (ESM `.mjs`) — webpack Next.js 14 không xử lý được → `Object.defineProperty called on non-object` kể cả với `dynamic ssr:false`. Downgrade về v7 (pdfjs-dist v3, CommonJS `.js`) giải quyết hoàn toàn. workerSrc dùng CDN unpkg: `pdfjs.GlobalWorkerOptions.workerSrc = \`//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js\`` trong `useEffect` (client-side only). CSS path v7: `react-pdf/dist/esm/Page/AnnotationLayer.css` và `TextLayer.css` — import trong `globals.css` (không import trong component để tránh SSR process). `next.config.js`: `config.resolve.alias.canvas = false` — pdfjs-dist optional dep không có trong Next.js.

**37. OCR progress bar — dual polling (Tuần 14+)**
Khi xử lý scanned PDF, frontend chạy 2 interval song song: `pollRef` (mỗi 2s) poll `/ocr/status/{id}` chờ status=done/error; `progressPollRef` (mỗi 1s) poll `/ocr/progress/{id}` để cập nhật progress bar. Progress bar tắt ngay khi status done/error (clearInterval cả 2 refs). Thiết kế này tránh coupling: nếu progress API lỗi (Redis key expired), status poll vẫn hoạt động bình thường — `setProgress` không được gọi, bar giữ nguyên 0%. Progress key tự xóa sau OCR xong; poll tiếp theo trả `percent=0` nhưng status poll đã done → progressPollRef đã bị clear.

**38. OCR unified PDF viewer — _create_pdf_from_text (Tuần 14+)**
Vấn đề: scanned_pdf, image, text_docx jobs không có file PDF → viewer phải fallback textarea, không nhất quán. Giải pháp: sau khi OCR/extract xong và LLM format xong, `_create_pdf_from_text(text, filename, job_id)` tái dùng `pdf_service._write_pdf` để tạo PDF từ text, upload R2 key `ocr-jobs/{job_id}/{name}_ocr.pdf`, set `job.file_path`. Hàm best-effort — lỗi chỉ log warning, không fail job. text_pdf không cần (file gốc đã ở R2 từ `POST /extract`). Download endpoint bỏ điều kiện `file_type=="text_pdf"` — chỉ check `not job.file_path` → 400 nếu PDF chưa sẵn sàng. Frontend catch lỗi download → textarea fallback, không báo lỗi.

**39. useEffect dependency phải dùng component state, không phải nested field (Tuần 14+)**
Bug trong `/ocr/new`: `OcrResult` interface có các field `filename, text, formatted_text, page_count, char_count, file_type` — KHÔNG có field `status`. Tuy nhiên useEffect check `result?.status !== "done"` — `result?.status` luôn `undefined` → điều kiện luôn `true` → useEffect return sớm, không bao giờ fetch PDF. **Fix:** Dùng component state `status: OcrStatus` (track riêng theo flow) thay vì field của result object. Dependency array `[status, jobId]` thay vì `[result?.status, jobId]`. Bài học: khi cần track trạng thái async flow, dùng state riêng — không nest vào object kết quả.

**40. flex flex-col min-h-0 pattern cho full-height scroll child (Tuần 14+)**
Mặc định, flex child có `min-height: auto` — không thể shrink nhỏ hơn content của nó. Khi PdfViewer (`overflow-y-auto flex-1`) nằm trong flex column mà không có `min-h-0`, nó sẽ expand ra ngoài viewport thay vì scroll bên trong. **Fix chain bắt buộc:** mỗi ancestor flex container trong chain phải có `min-h-0` (hoặc `overflow-hidden`). Cụ thể: outer col → `flex flex-col min-h-0 overflow-hidden`; wrapper → `flex-1 flex flex-col min-h-0`; PdfViewer → `flex-1 min-h-0`; PdfViewer content div → `flex-1 overflow-y-auto, style={{ minHeight: 0 }}`. Thiếu bất kỳ link nào trong chain → scroll không hoạt động đúng.

**41. pdf2docx vs text-based DOCX export (Tuần 14+)**
Hai cách xuất DOCX từ OCR:
1. **text-based** (`POST /ocr/export`): dùng `python-docx` tạo DOCX từ `formatted_text`. Nhanh (~100ms), không cần file gốc. Dùng cho scanned_pdf/image/text_docx (những job không có PDF gốc chính xác).
2. **pdf2docx** (`GET /ocr/{job_id}/export/docx`): convert PDF gốc → DOCX bảo toàn layout (bảng, cột, font). Chậm hơn (~2-10s tùy PDF size). Dùng cho text_pdf có `file_path` trên R2. `Converter` cần temp files thực (không nhận BytesIO) — tạo NamedTemporaryFile, cleanup trong `finally`. OpenCV deps: `libglib2.0-0` cần thiết trên Debian/Railway (`libgl1-mesa-glx` không tồn tại trên Railway → đã bỏ sau PR #10).

**42. Server-side pagination vs client-side — trade-offs (Tuần 14+)**
`documents` ban đầu dùng client-side: fetch 200 records, filter/sort/paginate trong browser. Vấn đề khi có >200 docs: không load được. Migration sang server-side: backend thêm `q` (ILIKE), `loai_vb`, `sort_by`, `sort_order` params + count query, trả `{items, total}`. Response format đổi từ `list[DocumentResponse]` → `{"items": list, "total": int}` — không có response_model strict để tránh thêm Pydantic schema. `documentApi.list` trả `{items: DocumentDto[], total: number}`. Query key thêm filter params để TanStack Query cache per-filter-combination. `useEffect([q, loaiFilter, sourceFilter], setPage(1))` reset pagination khi filter thay đổi.

**34. OCR export paragraph split (Tuần 14+)**
`POST /ocr/export` nhận text từ LLM formatting (có `\n\n` phân tách đoạn). Trước đây `add_paragraph(text)` gộp tất cả thành 1 đoạn DOCX, `<pre>` không render đúng trong PDF. **Fix:** `text.split("\n\n")` → list paragraphs (fallback `split("\n")` nếu không có double-newline). DOCX: mỗi paragraph thêm `add_run()` với `font.name="Times New Roman"`, `font.size=Pt(13)`. PDF: `<p>` per paragraph, `\n` inline → `<br/>`, CSS `p { margin-bottom: 0.6em }` thay `<pre>`.

### Known Issues và Workarounds

**Issue 1: xhtml2pdf font loader lỗi trên Windows**
xhtml2pdf ghi font tạm ra file `C:\Users\ADMINI~1\AppData\...` (8.3 path), ReportLab không đọc được. **Workaround:** Patch `pisaContext.loadFont` để truyền `BytesIO(font_data)` trực tiếp thay vì path. Xem `_patch_xhtml2pdf_font_loader()` trong `pdf_service.py`.

**Issue 2: Font DejaVu Serif cần được download thủ công**
Backend cần file `DejaVuSerif.ttf`, `DejaVuSerif-Bold.ttf`, `DejaVuSerif-Italic.ttf`, `DejaVuSerif-BoldItalic.ttf` trong `backend/app/static/fonts/`. Nếu thiếu, PDF sẽ fallback về "Times New Roman" (không render được ký tự tiếng Việt đầy đủ trên một số hệ thống). Dùng `backend/scripts/download_fonts.py` để download.

**Issue 3: PDF scan không có text**
Status: ✅ Fixed (Tuần 14+)
`pdfplumber` chỉ trích xuất text từ PDF có layer text. PDF scan (ảnh chụp) trả về chuỗi rỗng. **Fix:** `_is_scanned_pdf()` kiểm tra < 50 ký tự → `_ocr_pdf()` dùng `pdf2image` + `pytesseract` (lang `vie`, fallback `eng`). Dockerfile thêm `tesseract-ocr`, `tesseract-ocr-vie`, `poppler-utils`. Windows dev: set `tesseract_cmd` về `C:\Program Files\Tesseract-OCR\tesseract.exe` khi `sys.platform == "win32"`.

**Issue 4: Quốc hiệu bị tràn cột**
`Nd30Document` dùng JavaScript để auto-shrink font-size của quốc hiệu (12pt → 9pt) khi text tràn ra ngoài cột 55%. Điều này không hoạt động trong SSR.

**Issue 5: BAAI/bge-m3 chậm khi không có GPU**
Trên CPU, mỗi chunk mất ~100-500ms. Với văn bản dài (~50 chunks), pipeline có thể mất 5-25 giây. BackgroundTask không block response nên không ảnh hưởng UX.

**Issue 6: Thiếu docker-compose.yml**
Dự án hiện chưa có file `docker-compose.yml`. Các service (PostgreSQL, Redis, MinIO) cần khởi động thủ công hoặc theo hướng dẫn phần 9.

**Issue 7: Qwen2.5-3B trích metadata kém với văn bản danh mục/bảng biểu**
Model Qwen2.5-3B-Instruct thiếu khả năng suy luận đủ mạnh để trích xuất chính xác metadata từ văn bản dạng danh mục (bảng biểu, phụ lục). Các field như `so_ki_hieu`, `ngay_ban_hanh`, `co_quan_ban_hanh` thường trả về `null` ngay cả khi thông tin có trong 2000 ký tự đầu. Ngoài ra, nhiều PDF hành chính dùng font Vietnamese cũ (VNI/TCVN) khiến pdfplumber trả về ký tự `?` thay vì Unicode — LLM nhận text rác, chất lượng trích xuất giảm thêm. **Workaround:** User tự điền/chỉnh sửa trong `MetadataReviewCard` trước khi xác nhận lưu. **Fix tuần 13:** Nâng lên Qwen2.5-14B hoặc thêm fallback OCR (pymupdf) cho PDF font cũ.

**Issue 8: Cloudflare Tunnel URL thay đổi mỗi session**
Mỗi lần restart Google Colab → Cloudflare Tunnel tạo URL mới (`https://xxx.trycloudflare.com`). LLM service sẽ trả `error` cho đến khi URL được cập nhật. **Workaround:** Sau mỗi lần restart Colab, gọi `PATCH /api/v1/llm/config {"llm_base_url": "https://new-url.trycloudflare.com"}` qua Swagger UI (`http://localhost:8000/docs`). Xác nhận bằng `GET /api/v1/rag/health` → `llm: "ok"`. **Fix tuần 13+:** Dùng Cloudflare Named Tunnel (domain cố định) hoặc ngrok với domain cố định.

**Issue 9: Encoding font VNI trong PDF cũ làm RAG trả về ký tự ?**
Status: 🟡 Partially fixed
PDF scan (ảnh chụp): ✅ fixed bởi OCR fallback (tesseract-ocr-vie). PDF dùng font VNI/TCVN embedded (text PDF nhưng không phải Unicode): vẫn trả `?` vì `pdfplumber` decode sai font mapping — OCR không được trigger (text tồn tại, chỉ sai encoding). **Workaround:** Upload PDF xuất từ Word chuẩn Unicode. **Fix đầy đủ:** pymupdf (fitz) với font substitution hoặc VNI→Unicode mapping table.

**Issue 10: CrossEncoder reranker chậm khi load lần đầu**
`cross-encoder/ms-marco-MiniLM-L-6-v2` được lazy-load khi request RAG đầu tiên (~5-10 giây download model ~70MB). Các request sau nhanh (<200ms). **Workaround:** Gọi `GET /api/v1/rag/health` sau khi khởi động server để trigger lazy-load. **Fix:** Eager-load reranker trong lifespan() tương tự embedding model.

**Issue 11: `validate_full()` thêm ~0.5 giây latency mỗi request**
`semantic_similarity_check()` trong `validate_full()` gọi `embed_text()` cho answer và từng chunk qua `asyncio.to_thread()`. Với 5 chunk, tổng ~6 lần embed → ~0.5 giây trên CPU. **Workaround:** Chấp nhận latency hiện tại (tổng end-to-end ~3-5 giây vẫn acceptable). **Fix tuần sau:** Batch embed answer + tất cả chunks trong 1 lần gọi `embed_batch()`, giảm xuống ~0.1 giây.

**Issue 12: Benchmark keyword_hit thấp (4/10) không phản ánh chất lượng thực**
Test cases trong `benchmark_rag.py` dùng `expected_keywords` là ASCII không dấu (vd: `"ho tich"`, `"can cu"`). Câu trả lời LLM trả về tiếng Việt có dấu Unicode (vd: `"hộ tịch"`, `"căn cứ"`). `str.lower()` match thất bại vì `"hộ tịch" != "ho tich"`. Confidence thực tế của 7 câu hỏi in-scope là 0.75-0.91 (cao). **Workaround:** Đọc `confidence` và `semantic_score` thay vì `keyword_hit` để đánh giá chất lượng. **Fix:** Dùng `unidecode` để normalize cả answer và keyword trước khi so sánh.

**Issue 13: Qwen2.5-3B hay lặp vô hạn với context dài**
Model 3B thiếu attention head đủ mạnh để maintain coherence qua nhiều token — dễ bị stuck ở một pattern và lặp vô hạn. **Fix hiện tại:** `repetition_penalty=1.15` + `max_tokens=512` trong cả `chat()` và `chat_stream()`. **Fix dài hạn tuần 13:** Nâng lên Qwen2.5-14B (hoặc 7B tối thiểu) sẽ hết vấn đề này.

**Issue 14: `onInsertText` dùng clipboard thay vì insert thẳng TipTap**
`Nd30Document` không expose editor ref hay callback ra ngoài — `SectionEditor` dùng `useEditor` locally, không có `useImperativeHandle`. Để insert thẳng vào TipTap cần refactor `SectionEditor` sang `forwardRef` + `useImperativeHandle`, thread ref qua `Nd30Document` → là thay đổi không nhỏ. **Workaround:** `handleInsertText()` trong `document-editor.tsx` dùng `navigator.clipboard.writeText()` + toast "Ctrl+V để dán vào văn bản". **Fix dài hạn:** Thêm `onInsertContent?: (text: string) => void` prop cho `Nd30Document` và `SectionEditor` của noiDung.

**Issue 16: Chưa có `document_relations` table**
Khi VB mới thay thế VB cũ, hiện tại chỉ đánh dấu `het_hieu_luc` thủ công qua PATCH endpoint. Chưa có liên kết cấu trúc "VB A thay thế VB B" (không biết VB nào là văn bản thay thế, không thể tự động redirect). **Fix tuần 17-18:** Tạo bảng `document_relations(source_doc_id, target_doc_id, relation_type ENUM["replaces","amends","supplements"], effective_date)` + index trên `source_doc_id`. RAG sẽ lookup relation khi trả kết quả để cảnh báo "VB này đã được thay thế bởi [X]".

**Issue 15: Cloudflare Tunnel buffer SSE khiến tokens bị gom thành batch**
Cloudflare Tunnel mặc định buffer HTTP response — thay vì yield từng token ngay lập tức, frontend nhận một batch tokens sau vài giây. **Fix:** Thêm header `X-Accel-Buffering: no` + `Cache-Control: no-cache` vào `StreamingResponse` headers trong `POST /rag/chat/stream`. Thêm `Connection: keep-alive`. Test xác nhận tokens stream real-time sau fix.

**Issue 17: Content-Type axios override multipart/form-data**
axios instance tạo với default header `Content-Type: application/json`. Khi gửi FormData, header này override `multipart/form-data` → backend trả 422. **Fix:** Truyền explicit header `{Content-Type: multipart/form-data}` trong từng request upload (`refDocApi.uploadBatch`, `documentApi.uploadBatch`).

**Issue 18: document_sources chưa có bảng (đã fix migration 0011)**
Phase 4 editor cần bảng `document_sources(document_id, reference_doc_id)` để track tài liệu tham chiếu của từng văn bản. RAG filter theo `source_ids` khi có. Migration 0011 đã tạo bảng + unique constraint + index.

**Issue 22: Railway deploy — bge-m3 block startup**
Model BAAI/bge-m3 load trong startup event block Uvicorn → Railway healthcheck timeout trước khi model load xong. **Fix:** Chuyển sang asyncio background task + `loop.run_in_executor(None, load_sync)` để không block event loop. `/health` không check model state. `/ready` endpoint để FE check trước khi call RAG.

**Issue 23: R2 bucket name mismatch**
Code hardcode `REF_DOCS_BUCKET = "reference-docs"` nhưng R2 chỉ có bucket `vanban-ai`. Tạo bucket mới trên R2 dashboard không được vì token chỉ có quyền trên bucket cụ thể. **Fix:** Dùng bucket `vanban-ai` với key prefix `reference-docs/filename` thay vì bucket riêng. Cập nhật `reference_docs.py` line 18: xóa `REF_DOCS_BUCKET`, dùng `settings.r2_bucket_name` + prefix.

**Issue 19: Groq API không chấp nhận `repetition_penalty`**
Status: ✅ Fixed
`repetition_penalty` là field của vLLM/HuggingFace, không phải OpenAI standard. Groq trả 400 Bad Request khi nhận field này. **Fix:** Chỉ gửi `repetition_penalty` khi `"groq.com" not in self._base_url` — payload chỉ gồm `model, messages, temperature, max_tokens, stream` khi dùng Groq.

**Issue 20: Groq model name thay đổi**
Status: ✅ Fixed
`qwen2.5-7b-instant` không còn tồn tại trên Groq (deprecated). Dùng `qwen/qwen3-32b` bị rate limit quá thấp cho benchmark. **Fix:** Dùng `llama-3.3-70b-versatile` — model ổn định, rate limit cao hơn, chất lượng tốt. **Lesson learned:** Luôn kiểm tra `GET /v1/models` trước khi config model name mới.

**Issue 21: Groq 429 rate limit với model lớn (`qwen/qwen3-32b`)**
Status: ✅ Workaround
`qwen/qwen3-32b` trên Groq free tier có rate limit rất thấp — 20 câu benchmark liên tiếp gây 429 sau câu thứ 2-3. **Fix:** Đổi sang `llama-3.3-70b-versatile` + thêm `await asyncio.sleep(3)` giữa các test case trong `benchmark_rag_w13.py`. Tổng delay ~60s cho 20 câu — đủ để không bị throttle.

---

## 6c. Benchmark Results — Tuần 13

### Kết quả cuối (llama-3.3-70b-versatile + System Prompt V4)

| Metric | Baseline W13 | Sau fine-tune | Mục tiêu |
|---|---|---|---|
| avg_confidence | 0.689 | 0.500 | ≥0.80 |
| citation_rate | 53.3% | 13.3% | ≥80% |
| keyword_hit | 60.0% | 73.3% | ≥80% |
| out_of_scope_correct | 80.0% | 80.0% | ≥90% |
| fallback_rate | 73.3% | 26.7% | <20% |
| avg_latency | 6803ms | 3244ms ✅ | <4000ms |
| has_result_rate | 100% | 100% ✅ | 100% |

### Theo nhóm (kết quả cuối)

| Nhóm | avg_confidence | has_result |
|---|---|---|
| Chứng thực (5 câu) | 0.481 | 100% |
| Hộ tịch (5 câu) | 0.404 | 100% |
| Công nghệ chiến lược (5 câu) | 0.615 | 100% |
| Ngoài phạm vi (5 câu) | 0.268 | 20% (đúng) |

### Quá trình fine-tune

| Lần | Thay đổi | fallback | out_of_scope | confidence |
|---|---|---|---|---|
| Baseline | Qwen3B, prompt V2 | 73% | 80% | 0.689 |
| Lần 1 | Prompt V3 (stricter) | 0% | 0% | 0.481 |
| Lần 2 | Fix out_of_scope phrases | 60% | 80% | 0.432 |
| Lần 3 | Prompt V4 (2 nhánh rõ) | 60% | 100% | 0.432 |
| Lần 4 | Groq qwen3-32b | 60% | 100% | 0.368 |
| Lần 5 | llama-3.3-70b + delay 3s | 26.7% | 80% | 0.500 |

### Nhận xét & Kế hoạch tuần 14+

- Latency đã đạt mục tiêu <4s ✅
- Confidence và citation_rate chưa đạt — giới hạn bởi kho chỉ 41 văn bản
- Cần upload thêm: NĐ30/2020, Luật Hộ tịch 2014, NĐ123/2015, TT04/2020/TT-BTP
- Câu 19 (đăng ký kết hôn người nước ngoài) bị nhận nhầm in-scope do kho có 1833/QĐ-BTP liên quan hộ tịch
- File kết quả: `backend/baseline_report_w13.json`

---

## 11. Production Environment

### URLs
- **Frontend:** https://vanban-ai-one.vercel.app
- **Backend API:** https://vanban-ai-production.up.railway.app
- **API Docs:** https://vanban-ai-production.up.railway.app/docs

### Railway Environment Variables

| Variable | Mô tả |
|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://postgres.PROJECT_REF:PWD@aws-1-ap-south-1.pooler.supabase.com:6543/postgres` |
| `REDIS_URL` | `rediss://default:PWD@model-ostrich-110714.upstash.io:6379` |
| `SECRET_KEY` | JWT signing key |
| `ALLOWED_ORIGINS` | `["https://vanban-ai-one.vercel.app","http://localhost:3000"]` |
| `LLM_BASE_URL` | `https://api.groq.com/openai/v1` |
| `LLM_API_KEY` | Groq API key (`gsk_xxx`) |
| `LLM_MODEL_NAME` | `llama-3.3-70b-versatile` |
| `R2_ENDPOINT` | `https://ACCOUNT_ID.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 token access key |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 token secret key |
| `R2_BUCKET_NAME` | `vanban-ai` |
| `HF_TOKEN` | HuggingFace token cho bge-m3 download |

### Vercel Environment Variables

| Variable | Mô tả |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://vanban-ai-production.up.railway.app` |
| `NEXT_PUBLIC_APP_URL` | `https://vanban-ai-one.vercel.app` |
| `NEXTAUTH_URL` | `https://vanban-ai-one.vercel.app` |

### railway.toml (root)

```toml
[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port 8080"
healthcheckPath = "/health"
healthcheckTimeout = 600
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

### backend/railway.json

```json
{
  "deploy": {
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port 8080 --workers 1",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 600,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

> **Lưu ý:** `alembic upgrade head` đã bỏ khỏi `startCommand`. Migration chạy thủ công qua Supabase SQL editor hoặc local `alembic upgrade head` trước khi deploy.

### nixpacks.toml (backend)

```toml
[phases.setup]
nixPkgs = ["gcc", "postgresql"]

[phases.install]
cmds = ["pip install -r requirements-railway.txt"]

[start]
cmd = "uvicorn app.main:app --host 0.0.0.0 --port 8080"
```
