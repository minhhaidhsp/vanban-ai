# VănBản.AI — Tài liệu Kỹ thuật

> Cập nhật: 2026-05-23
> Phiên bản: Tuần 7

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
| 7 | Preview mode A4 read-only (DocumentPreview + DocumentPreviewPaged), Ctrl+Shift+P, xuất PDF (xhtml2pdf + Puppeteer) |

### Tech stack thực tế

**Frontend:**
- Next.js 14.2.18 (App Router, SSR/SSG)
- React 18, TypeScript 5
- TipTap 3.23.6 (editor phong phú: StarterKit, Underline, TextAlign, Highlight, Placeholder)
- TanStack Query 5.62.11 (data fetching và caching)
- Axios 1.7.9 (HTTP client)
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
- pdfplumber ≥0.11.0 (trích xuất text từ PDF)
- python-docx ≥1.1.0 (trích xuất text từ DOCX)
- xhtml2pdf ≥0.2.0 + ReportLab (xuất PDF phía backend)
- Pydantic 2.10.3 + pydantic-settings 2.6.1

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
│                                                              │
│  Services: embedding_service, chunking_service,              │
│            pipeline_service, pdf_service                     │
└────┬───────────────┬──────────────────┬──────────────────────┘
     │               │                  │
┌────▼───┐    ┌──────▼──────┐    ┌──────▼──────┐
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
│   │   └── reference-docs/
│   │       └── page.tsx         # Kho văn bản tham chiếu (filter, phân trang)
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
│   │   ├── sidebar.tsx          # Nav sidebar: Tổng quan, Tài liệu, Kho văn bản...
│   │   ├── document-list.tsx    # Grid danh sách tài liệu, nút xóa/sửa
│   │   └── document-dialog.tsx  # Dialog tạo tài liệu mới (title)
│   ├── editor/
│   │   ├── nd30-document.tsx    # Soạn thảo A4 NĐ30 (toàn bộ thể thức)
│   │   ├── document-editor.tsx  # Wrapper: autosave, preview, PDF export
│   │   ├── DocumentPreview.tsx  # Preview read-only A4 NĐ30
│   │   ├── DocumentPreviewPaged.tsx # Preview có nút xuất PDF
│   │   ├── editor-toolbar.tsx   # TipTap toolbar (bold, italic, align...)
│   │   ├── nd30-field.tsx       # Inline editable field theo chuẩn NĐ30
│   │   └── recipient-tag-input.tsx  # Tag input cho Nơi nhận
│   ├── reference-docs/
│   │   ├── ref-doc-table.tsx    # Bảng danh sách văn bản tham chiếu
│   │   └── upload-modal.tsx     # Dialog thêm/sửa + upload file
│   └── ui/                      # shadcn/ui components (Button, Input, Dialog...)
├── lib/
│   ├── api.ts                   # Axios client + authApi, documentApi, refDocApi...
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
│   │           ├── reference_docs.py  # CRUD + upload + 3 search endpoints
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
│   │   └── pdf_service.py       # generate_pdf() — xhtml2pdf + DejaVu Serif
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
| `hieu_luc` | VARCHAR(20) | `chua` / `con_hieu_luc` / `het_hieu_luc` / `mot_phan` (indexed) |
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
| DELETE | `/reference-docs/{id}` | Xóa (kèm file MinIO) | — | 204 No Content |
| POST | `/reference-docs/{id}/upload` | Upload file + trigger embedding pipeline | `multipart: file` | `RefDocResponse` |

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

### Luồng 6: Xuất PDF

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

### Lệnh khởi động tóm tắt

| Thành phần | Lệnh | Port |
|-----------|------|------|
| Backend | `uvicorn app.main:app --reload` | 8000 |
| Frontend | `npm run dev` | 3000 |
| MinIO UI | Truy cập browser | 9001 |
| Swagger UI | `http://localhost:8000/docs` | 8000 |

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
