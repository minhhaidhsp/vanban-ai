#!/bin/bash
set -e

echo "=== Testing imports ==="
python -c "
import sys
modules = [
    'app.main',
    'app.api.v1.router',
    'app.api.v1.endpoints.ocr',
    'app.api.v1.endpoints.documents',
    'app.api.v1.endpoints.reference_docs',
    'app.services.pipeline_service',
    'app.services.pdf_service',
]
for m in modules:
    try:
        __import__(m)
        print(f'OK: {m}')
    except Exception as e:
        print(f'FAIL: {m} — {e}', file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
"

echo "=== Starting server ==="
exec uvicorn app.main:app --host 0.0.0.0 --port 8080
