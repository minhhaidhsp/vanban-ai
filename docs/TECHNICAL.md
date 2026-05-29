# VănBản.AI — Tài liệu Kỹ thuật

> Cập nhật: 2026-05-30
> Phiên bản: Tuần 12-13 (UI Redesign + Editor 3 cột)

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
- js-cookie 3.0.5 (lưu JWT token)

**Backend:**
- FastAPI 0.115.5 + Uvicorn 0.32.1
- SQLAlchemy 2.0.36 (async, asyncpg driver)
- Alembic 1.14.0 (migration)
- PostgreSQL + pgvector 0.3.6 (vector similarity search)
- Redis 5.2.1 (cache, dùng redis.asyncio)
- MinIO 7.2.11 (object storage S3-compatible)
- python-jose 3.3.0 + passlib[bcrypt] 1.7.4 (JWT auth)
- sentence-transformers ≥3.0.0 với model **BAAI/bge-m3** (dim=1024)
- cross-encoder/ms-marco-MiniLM-L-6-v2 (reranker cho RAG pipeline)
- httpx ≥0.27.0 (async HTTP client cho LLM API — cả non-stream và stream)
- FastAPI `StreamingResponse` (SSE streaming — built-in, không cần sse-starlette)
- pdfplumber ≥0.11.0 (trích xuất text từ PDF)
- python-docx ≥1.1.0 (trích xuất text từ DOCX)
- xhtml2pdf ≥0.2.0 + ReportLab (xuất PDF phía backend)
- Pydantic 2.10.3 + pydantic-settings 2.6.1

**External services:**
- transformers + FastAPI (LLM inference server thay vLLM, tránh CUDA 12.8 conflict)
- Groq API (plan: OpenAI-compatible, Qwen2.5-7B-Instruct, free tier 6000 token/phút)
- Qwen/Qwen2.5-3B-Instruct (LLM model, max_model_len=4096 token)
- Cloudflare Tunnel (expose Colab → internet; URL thay đổi mỗi session)

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
│   │   ├── document-editor.tsx  # Wrapper: autosave, preview, PDF export, nút Trợ lý AI
│   │   ├── ChatPanel.tsx        # Chat AI panel cố định bên phải 380px, SSE streaming
│   │   ├── DocumentPreview.tsx  # Preview read-only A4 NĐ30
│   │   ├── DocumentPreviewPaged.tsx # Preview có nút xuất PDF
│   │   ├── editor-toolbar.tsx   # TipTap toolbar (bold, italic, align...)
│   │   ├── nd30-field.tsx       # Inline editable field theo chuẩn NĐ30
│   │   └── recipient-tag-input.tsx  # Tag input cho Nơi nhận
│   ├── reference-docs/
│   │   ├── ref-doc-table.tsx    # Bảng danh sách văn bản tham chiếu
│   │   ├── upload-modal.tsx     # Dialog thêm/sửa + upload file
│   │   └── MetadataReviewCard.tsx  # Dialog polling + review metadata từ LLM
│   └── ui/                      # shadcn/ui components (Button, Input, Dialog...)
├── lib/
│   ├── api.ts                   # Axios client + authApi, documentApi, refDocApi, chatApi (SSE)
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
│   │           ├── reference_docs.py  # CRUD + upload + 3 search + metadata endpoints
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
│   │   └── recipient_suggestion.py # RecipientSuggestion
│   ├── schemas/
│   │   ├── user.py              # UserCreate, UserResponse, Token
│   │   ├── document.py          # DocumentCreate/Update/Response
│   │   └── reference_document.py  # RefDocCreate/Update/Response + search schemas
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
│       └── 0006_fts.py          # search_vector column + trigger + GIN index
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

### Quan hệ giữa các bảng

```
users (1) ──< documents (N)           [owner_id → users.id]
users (1) ──< reference_documents (N) [created_by → users.id]
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
| GET | `/documents/` | Danh sách văn bản của user | `?skip=0&limit=20` | `DocumentResponse[]` |
| POST | `/documents/` | Tạo văn bản mới | `{title, content?, loai_vb?, so_van_ban?, nam?}` | `DocumentResponse` (201) |
| GET | `/documents/next-number` | Lấy số thứ tự tiếp theo | `?loai=QĐ` | `{so, nam, loai}` |
| GET | `/documents/{id}` | Lấy chi tiết văn bản | — | `DocumentResponse` |
| PATCH | `/documents/{id}` | Cập nhật văn bản | `DocumentUpdate` (partial) | `DocumentResponse` |
| DELETE | `/documents/{id}` | Xóa văn bản | — | 204 No Content |
| POST | `/documents/{id}/export/pdf` | Xuất PDF (xhtml2pdf) | — | PDF binary (`application/pdf`) |
| POST | `/documents/{id}/upload` | Upload file đính kèm | `multipart: file` | `DocumentResponse` |

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
| GET | `/reference-docs/` | Danh sách văn bản tham chiếu | `?skip, limit, loai, hieu_luc, q` | `RefDocListResponse {items[], total, skip, limit}` |
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
2. Download file bytes từ MinIO bucket `reference-docs` (chạy trong thread)
3. Trích xuất text: PDF → `pdfplumber`, DOCX → `python-docx`, khác → UTF-8 decode
4. Chunk bằng `chunk_document()` với metadata `{so_ki_hieu, co_quan_ban_hanh}`
5. Embed tất cả chunks theo batch (batch_size=8)
6. Xóa các chunk cũ trong DB (idempotent)
7. Bulk insert `ReferenceDocChunk` rows với embedding
8. Lưu embedding của chunk đầu tiên lên `reference_documents.embedding` (document-level search)
9. Commit DB

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
   - PDF: pdfplumber.open() → page.extract_text() cho từng trang
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
| Backend | `uvicorn app.main:app --reload` | 8000 |
| Frontend | `npm run dev` | 3000 |
| MinIO UI | Truy cập browser | 9001 |
| Swagger UI | `http://localhost:8000/docs` | 8000 |
| vLLM (Colab) | Xem mục "Khởi động LLM" | Cloudflare URL |

---

## 10. Ghi chú kỹ thuật

### Quyết định kiến trúc quan trọng

**1. Eager-load embedding model**
Model BAAI/bge-m3 được load ngay khi `app.services.embedding_service` được import (module-level `_model`). Điều này đảm bảo request đầu tiên không bị delay, nhưng tăng thời gian khởi động và tiêu thụ RAM (~2-3GB). Được trigger trong `lifespan()` của FastAPI.

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

### Known Issues và Workarounds

**Issue 1: xhtml2pdf font loader lỗi trên Windows**
xhtml2pdf ghi font tạm ra file `C:\Users\ADMINI~1\AppData\...` (8.3 path), ReportLab không đọc được. **Workaround:** Patch `pisaContext.loadFont` để truyền `BytesIO(font_data)` trực tiếp thay vì path. Xem `_patch_xhtml2pdf_font_loader()` trong `pdf_service.py`.

**Issue 2: Font DejaVu Serif cần được download thủ công**
Backend cần file `DejaVuSerif.ttf`, `DejaVuSerif-Bold.ttf`, `DejaVuSerif-Italic.ttf`, `DejaVuSerif-BoldItalic.ttf` trong `backend/app/static/fonts/`. Nếu thiếu, PDF sẽ fallback về "Times New Roman" (không render được ký tự tiếng Việt đầy đủ trên một số hệ thống). Dùng `backend/scripts/download_fonts.py` để download.

**Issue 3: PDF scan không có text**
`pdfplumber` chỉ trích xuất text từ PDF có layer text (text-based PDF). PDF scan (ảnh chụp) sẽ trả về chuỗi rỗng. Pipeline sẽ log warning và bỏ qua embedding.

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
Một số PDF hành chính dùng font VNI/TCVN (không phải Unicode). `pdfplumber` trả về ký tự `?` thay vì chữ có dấu tiếng Việt. Chunk embedding vẫn hoạt động (bge-m3 robust với nhiễu), nhưng `content_preview` trong citation cards và câu trả lời LLM chứa `?` thay vì ký tự Việt đúng. **Workaround:** Upload PDF chuẩn Unicode (xuất từ Word, font Times New Roman). **Fix:** Thêm OCR fallback (tesseract-ocr tiếng Việt hoặc pymupdf) tuần sau.

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
