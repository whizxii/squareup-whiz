# ---------- Build stage ----------
FROM python:3.11-slim AS builder

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ---------- Runtime stage ----------
FROM python:3.11-slim

# Non-root user for security
RUN groupadd --gid 1000 appuser && \
    useradd --uid 1000 --gid appuser --shell /bin/bash --create-home appuser

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code (secrets excluded via .dockerignore)
COPY . .

# Remove any secrets that might have slipped in
RUN rm -f .env firebase-credentials.json

# Switch to non-root user
USER appuser

EXPOSE 8000

# Run migrations then start the server (no --reload in production)
CMD ["sh", "-c", "python -m alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
