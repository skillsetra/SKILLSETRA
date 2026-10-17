# Single-service SKILLSETRA demo image.
# One public port (3000) serves the Next.js UI; Next.js proxies /api/v1 to FastAPI on port 8000.

FROM node:20-bookworm-slim AS frontend-build
WORKDIR /app/frontend
ENV NEXT_PUBLIC_DEMO_MODE=true \
    NEXT_PUBLIC_API_BASE_URL= \
    BACKEND_INTERNAL_URL=http://127.0.0.1:8000
COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build && npm prune --omit=dev

FROM node:20-bookworm-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NODE_ENV=production \
    DEMO_MODE=true \
    ENVIRONMENT=demo \
    AI_PROVIDER=puter \
    PUTER_MODEL=openai/gpt-oss-20b \
    CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://skillsetra-lz2i.onrender.com \
    BACKEND_INTERNAL_URL=http://127.0.0.1:8000 \
    NEXT_PUBLIC_DEMO_MODE=true \
    NEXT_PUBLIC_API_BASE_URL= \
    PORT=3000

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-venv python3-pip ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/requirements.txt /app/backend/requirements.txt
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir -r /app/backend/requirements.txt

COPY --from=frontend-build /app/frontend /app/frontend
COPY backend/ /app/backend/
COPY learning-materials/ /app/learning-materials/
COPY field-guides/ /app/field-guides/
COPY database/ /app/database/
COPY docs/ /app/docs/
COPY docker/ /app/docker/
COPY README-FIRST.txt DEMO_README.txt FULLSTACK_README.txt MATERIALS_SETUP.md /app/
RUN chmod +x /app/docker/start-demo.sh && mkdir -p /app/backend/data

EXPOSE 3000
CMD ["/app/docker/start-demo.sh"]
