#!/bin/sh
set -eu
cd /app

export DEMO_MODE="${DEMO_MODE:-true}"
export ENVIRONMENT="${ENVIRONMENT:-demo}"
export AI_PROVIDER="${AI_PROVIDER:-puter}"
export BACKEND_INTERNAL_URL="${BACKEND_INTERNAL_URL:-http://127.0.0.1:8000}"
export NEXT_PUBLIC_DEMO_MODE="true"
export NEXT_PUBLIC_API_BASE_URL=""
export PORT="${PORT:-3000}"

# Start FastAPI in the same container.
/opt/venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!
trap 'kill "$BACKEND_PID" 2>/dev/null || true' EXIT INT TERM

# Give FastAPI a moment to boot before starting Next.js.
for i in $(seq 1 60); do
  if /usr/bin/python3 - <<'PY'
import urllib.request
try:
    urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health', timeout=1).read()
    raise SystemExit(0)
except Exception:
    raise SystemExit(1)
PY
  then break; fi
  sleep 1
done

exec npm --prefix /app/frontend run start -- -H 0.0.0.0 -p "$PORT"
