# SKILLSETRA — Render deployment

This release is configured for a **single Render Docker web service**. The container runs:

- Next.js on Render's public `$PORT`
- FastAPI on `127.0.0.1:8000`
- Next.js proxies `/api/v1/*` to FastAPI internally

This avoids the common `HTTP 502` caused by deploying the frontend alone while its proxy still points at a nonexistent `127.0.0.1:8000`.

## Recommended deployment

1. Push this repository to GitHub.
2. In Render choose **New → Blueprint** and select the repository.
3. Render will use `render.yaml` and the root `Dockerfile`.
4. Set the secret environment variables requested by `render.yaml`.
5. Deploy/redeploy after saving the variables.
6. Verify:
   - `/api/v1/health` returns JSON with `status: ok`.
   - `Try a Demo` creates a workspace.
   - Supabase sign-in works when the public Supabase variables and server-only service-role key are configured.

## Required values

For demo-only use, the public demo works without Supabase credentials:

```env
DEMO_MODE=true
ALLOW_PRODUCTION_DEMO=true
ENVIRONMENT=production
AI_PROVIDER=puter
PUTER_MODEL=openai/gpt-oss-20b
BACKEND_INTERNAL_URL=http://127.0.0.1:8000
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_API_BASE_URL=
```

For account sign-in, also configure:

```env
SUPABASE_URL=<your Supabase project URL>
SUPABASE_ANON_KEY=<your public anon/publishable key>
SUPABASE_SERVICE_ROLE_KEY=<your server-only service-role key>
NEXT_PUBLIC_SUPABASE_URL=<your Supabase project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your public anon/publishable key>
NEXT_PUBLIC_SITE_URL=<your Render public URL>
CORS_ORIGINS=<your Render public URL>
```

Never put `SUPABASE_SERVICE_ROLE_KEY` in a `NEXT_PUBLIC_*` variable or commit it to Git.

## Split frontend/backend deployment

If you intentionally deploy two Render services instead of the recommended single container:

- Frontend `BACKEND_INTERNAL_URL` must be the **backend service URL**, not the frontend URL.
- Example: `BACKEND_INTERNAL_URL=https://skillsetra-api.onrender.com`
- Keep `NEXT_PUBLIC_API_BASE_URL=` empty when using the Next.js proxy.
- Alternatively, set `NEXT_PUBLIC_API_BASE_URL` to the backend URL and make sure the backend CORS origin exactly matches the frontend origin.

Do not set `BACKEND_INTERNAL_URL` to the frontend's own Render URL; that creates a proxy loop and results in 502 errors.
