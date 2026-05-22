"""One-time script to create MinIO buckets."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from minio import Minio

client = Minio(
    endpoint="localhost:9000",
    access_key="admin",
    secret_key="admin123",
    secure=False,
)

for bucket in ["vanban-ai", "reference-docs"]:
    if client.bucket_exists(bucket):
        print(f"  bucket '{bucket}' already exists")
    else:
        client.make_bucket(bucket)
        print(f"  created bucket '{bucket}'")

print("done")
