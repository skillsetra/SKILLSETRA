import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
const read=(p)=>readFileSync(resolve(process.cwd(),p),'utf8');

test('landing has Let’s Get Started, a small sign-in link, and Try a Demo instead of Open workspace',()=>{
 const landing=read('components/stitch-source/components/Screens/PublicLanding.tsx');
 assert.match(landing,/href="\/sign-up">Let’s Get Started/);
 assert.match(landing,/landing-signin-note.*href="\/sign-in">Sign in/s);
 assert.match(landing,/className="landing-cta landing-try-demo" onClick=\{onDemo\}>Try a Demo/);
 assert.doesNotMatch(landing,/Open workspace|Open dashboard|href="\/dashboard"/);
 const css=read('app/globals.css');
 assert.match(css,/html\[data-theme="light"\] \.landing-explainer article\{background:linear-gradient/);
 assert.match(css,/html\[data-theme="light"\] \.landing-explainer p\{color:#526176/);
 const compose=read('../docker-compose.production.yml');
 assert.match(compose,/NEXT_PUBLIC_DEMO_MODE:\s*"\$\{NEXT_PUBLIC_DEMO_MODE:-true\}"/);
 assert.match(compose,/ALLOW_PRODUCTION_DEMO:\s*"\$\{ALLOW_PRODUCTION_DEMO:-true\}"/);
});

test('sign-up and sign-in support Supabase forms and demo access at the same time',()=>{
 for(const file of ['app/sign-up/page.tsx','app/sign-in/page.tsx']){
  const source=read(file);
  assert.match(source,/import \{supabase\} from "\.\.\/\.\.\/lib\/supabase"/);
  assert.match(source,/demoAvailable&&<div className="auth-demo-choice"/);
  assert.match(source,/disabled=\{busy\|\|!supabase/);
 }
 const provider=read('components/AppProvider.tsx');
 assert.match(provider,/const signIn=async/);
 assert.match(provider,/const signUp=async/);
 assert.match(provider,/demoAvailable:demoEnabled/);
});

test('API sends a demo header only for an active demo identity when no auth token exists',()=>{
 const source=read('lib/api.ts');
 assert.match(source,/if \(!token && DEMO_ENABLED\)/);
 assert.match(source,/demoUser\.id === demoSession/);
 assert.match(source,/headers\.set\("X-SKILLSETRA-Demo-Session", demoSession\)/);
});

test('admin credentials are server-side, constant-time compared, and cookie session is protected',()=>{
 const auth=read('lib/admin-auth.ts');
 const login=read('app/api/admin/login/route.ts');
 const page=read('app/admin/page.tsx');
 assert.match(auth,/process\.env\.ADMIN_USERNAME/);
 assert.match(auth,/process\.env\.ADMIN_PASSWORD/);
 assert.match(auth,/process\.env\.ADMIN_SESSION_SECRET/);
 assert.match(auth,/timingSafeEqual/);
 assert.match(login,/httpOnly:true/);
 assert.match(login,/sameSite:"strict"/);
 assert.match(login,/maxAge:ADMIN_SESSION_SECONDS/);
 assert.match(page,/verifyAdminSessionToken\(token\)/);
 assert.match(page,/redirect\("\/admin\/login"\)/);
 assert.equal(existsSync(resolve(process.cwd(),'app/admin/login/page.tsx')),true);
 assert.equal(existsSync(resolve(process.cwd(),'app/api/admin/logout/route.ts')),true);
});

test('Supabase setup creates profile rows for new users and user-owned workspace snapshots',()=>{
 const sql=read('../database/supabase/SKILLSETRA_AUTH_SETUP.sql');
 assert.match(sql,/after insert on auth\.users/i);
 assert.match(sql,/public\.skillsetra_handle_new_auth_user/i);
 assert.match(sql,/public\.workspace_snapshots/i);
 assert.match(sql,/auth\.uid\(\) = user_id/i);
 assert.match(sql,/alter table public\.profiles enable row level security/i);
});

test('backend selects Supabase identity before considering a demo session and isolates workspace mode per request',()=>{
 const auth=read('../backend/app/core/auth.py');
 const workspace=read('../backend/app/core/workspace.py');
 assert.ok(auth.indexOf('if creds and creds.credentials') < auth.indexOf('if demo_session:'));
 assert.match(auth,/workspace_store\.bind\(uid, creds\.credentials, is_demo=False\)/);
 assert.match(auth,/workspace_store\.bind\(uid, None, is_demo=True\)/);
 assert.match(workspace,/def is_demo\(self\)/);
 assert.match(workspace,/if self\.is_demo\(\)/);
});
