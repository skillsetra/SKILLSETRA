# SKILLSETRA private administrator route

The private administrator pages are not linked from the public navigation:

- Login: `/admin/login`
- Authenticated admin overview: `/admin`
- Login API: `/api/admin/login`

## Configure credentials

Do not hard-code an administrator password into a React/Next.js page. Configure all three **server-side** values in `frontend/.env.local` for local development, or in the frontend hosting provider's environment/secret settings:

```dotenv
ADMIN_USERNAME=choose-your-admin-username
ADMIN_PASSWORD=replace-with-a-unique-password-of-12-or-more-characters
ADMIN_SESSION_SECRET=replace-with-a-random-secret-of-32-or-more-characters
```

The values above are placeholders, not working credentials. Replace all three. The route stays disabled until the username, password (12+ characters), and session secret (32+ characters) are configured. The admin password and session secret must never use `NEXT_PUBLIC_` variables. Restart the frontend after changing local environment values; redeploy after changing hosted values.

Sessions use a signed, HTTP-only, SameSite=Strict cookie scoped to `/admin`, expire after 8 hours, and are invalidated when the password or signing secret changes. Login attempts are rate-limited in the running frontend process. On serverless hosts, configure additional edge/WAF rate limiting for stronger cross-instance limits.

## Supabase account/workspace configuration

1. Run `database/supabase/SKILLSETRA_AUTH_SETUP.sql` in the Supabase SQL Editor. This creates the user profile trigger, row-level-security policy and per-user workspace snapshot table/policy.
2. In `frontend/.env.local` or frontend-host environment settings, set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_DEMO_MODE=true` (when you want the demo button available).
3. In the backend environment, set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DEMO_MODE=true` to enable demo sessions, plus the proper `ENVIRONMENT` and CORS origins for your deployment. Production defaults to blocking demo sessions; set `ALLOW_PRODUCTION_DEMO=true` only if you intentionally want a public demo alongside Supabase accounts. Leave it false if a production demo is not required.
4. Never expose `SUPABASE_SERVICE_ROLE_KEY` in any `NEXT_PUBLIC_*` variable or in a shipped ZIP, client-side file, or repository.
5. Set the Supabase Auth Site URL and allowed redirect URLs to your actual local/deployed web origins. Decide whether email confirmation should be enabled in the Supabase Auth settings.
6. Test two separate user accounts and a demo session; verify their workspace snapshots do not overlap before public launch.

A newly registered user is stored in Supabase Auth. With the SQL trigger applied, their `profiles` row is created from the sign-up metadata. User workspace snapshots are stored in `public.workspace_snapshots` by the backend using the user's Supabase access token and row-level security. This does not mean every optional feature-specific table in the extended schema is automatically populated.
