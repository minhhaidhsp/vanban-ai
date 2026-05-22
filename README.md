# VănBản.AI

Ứng dụng xử lý và phân tích văn bản thông minh với AI.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | FastAPI + SQLAlchemy 2.0 + Alembic |
| Database | PostgreSQL + pgvector |
| Storage | MinIO |
| Cache | Redis |

## Cấu trúc thư mục

```
vanban-ai/
├── frontend/          # Next.js application
├── backend/           # FastAPI application
├── .env.example       # Environment variables template
├── .gitignore
└── README.md
```

## Cài đặt

### 1. Clone và cấu hình môi trường

```bash
git clone <repo-url>
cd vanban-ai
cp .env.example .env
```

### 2. Khởi động Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

pip install -r requirements.txt

# Chạy migrations
alembic upgrade head

# Khởi động server
uvicorn app.main:app --reload --port 8000
```

### 3. Khởi động Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Services (Docker)

```bash
# PostgreSQL với pgvector
docker run -d --name postgres-vanban \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=vanban_ai \
  -p 5432:5432 \
  ankane/pgvector

# Redis
docker run -d --name redis-vanban \
  -p 6379:6379 \
  redis:7-alpine

# MinIO
docker run -d --name minio-vanban \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  -p 9000:9000 -p 9001:9001 \
  minio/minio server /data --console-address ":9001"
```

## API Documentation

Sau khi khởi động backend, truy cập:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Frontend

Truy cập: http://localhost:3000
