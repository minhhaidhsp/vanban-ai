FROM python:3.11-slim

# Prevent .pyc files and enable unbuffered stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TOKENIZERS_PARALLELISM=false \
    OMP_NUM_THREADS=1

WORKDIR /app

# Install system dependencies required by psycopg2, pdfplumber, xhtml2pdf, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libxml2-dev \
    libxslt1-dev \
    libffi-dev \
    libssl-dev \
    libcairo2-dev \
    pkg-config \
    tesseract-ocr \
    tesseract-ocr-vie \
    poppler-utils \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (layer-cached unless requirements change)
COPY requirements-railway.txt .
RUN pip install --no-cache-dir -r requirements-railway.txt

# Copy the rest of the application
COPY . .

EXPOSE 8000

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1
