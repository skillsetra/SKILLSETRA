#!/bin/sh
set -eu
cd /app
: "${SUPABASE_URL:?Set SUPABASE_URL for production}"
: "${SUPABASE_ANON_KEY:?Set SUPABASE_ANON_KEY for production}"
: "${SUPABASE_SERVICE_ROLE_KEY:?Set SUPABASE_SERVICE_ROLE_KEY as a server-only secret}"
: "${CORS_ORIGINS:?Set CORS_ORIGINS to the exact production origin}"
if [ "${DEMO_MODE:-false}" != "false" ] || [ "${ENVIRONMENT:-production}" != "production" ]; then
  echo "Refusing to start production launcher unless DEMO_MODE=false and ENVIRONMENT=production" >&2
  exit 1
fi
export BACKEND_INTERNAL_URL="${BACKEND_INTERNAL_URL:-http://127.0.0.1:8000}"
export PORT="${PORT:-3000}"
/opt/venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!
trap 'kill "$BACKEND_PID" 2>/dev/null || true' EXIT INT TERM
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
