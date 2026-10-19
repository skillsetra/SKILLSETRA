import { DEMO_ENABLED } from "./demo";

const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
const DEFAULT_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS || 30000);
const SAFE_GET_RETRIES = 2;
const AI_ANALYSIS_RETRIES = 1;

function v1(path: string) {
  if (path.startsWith("/api/v1/")) return path;
  if (path.startsWith("/api/")) return path.replace(/^\/api\//, "/api/v1/");
  return path.startsWith("/") ? `/api/v1${path}` : `/api/v1/${path}`;
}

function timeoutFor(path: string, method: string): number {
  // AI and file analysis can take longer than ordinary workspace reads/writes.
  const slowOperation = /\/(?:assessment\/(?:generate|ask-question)|projects\/analyze(?:-upload)?|github\/analyze|reasoning\/analyze|ai\/ask|resume\/analyze|interview)/i.test(v1(path));
  return slowOperation && method !== "GET" ? Math.max(DEFAULT_TIMEOUT_MS, 90000) : DEFAULT_TIMEOUT_MS;
}

function normalizeRequestError(error: any): any {
  if (error?.name === "AbortError") {
    const timeout: any = new Error("The request timed out. The server may still be processing it; please check the result before submitting again.");
    timeout.code = "TIMEOUT";
    return timeout;
  }
  if (error instanceof TypeError) {
    const network: any = new Error("Cannot reach the SKILLSETRA backend. Check that the API is running and retry.");
    network.code = "NETWORK";
    return network;
  }
  return error;
}

function isSafeRetry(error: any): boolean {
  return error?.code === "NETWORK" || error?.code === "TIMEOUT" || [429, 502, 503, 504].includes(Number(error?.status));
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

async function apiRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  if (typeof window === "undefined") throw new Error("The SKILLSETRA workspace API is browser-only. Call it from a client component after hydration.");

  const method = String(options.method || "GET").toUpperCase();
  const safeToRetry = method === "GET" && !options.body;
  // AI generation/analysis requests are computational and do not create user
  // records themselves. Retry one transient transport/5xx failure using the
  // same request ID so observability and any server-side deduplication remain stable.
  const retryableAI = method === "POST" && /\/(?:assessment\/(?:generate|ask-question)|projects\/analyze(?:-upload)?|github\/analyze|reasoning\/analyze|ai\/ask|resume\/analyze|interview\/(?:generate|ask-question))$/i.test(v1(path));
  const maxRetries = safeToRetry ? SAFE_GET_RETRIES : retryableAI ? AI_ANALYSIS_RETRIES : 0;
  const requestUrl = `${BASE}${v1(path)}`;
  const headers = new Headers(options.headers);
  if (options.body && !(typeof FormData !== "undefined" && options.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  headers.set("X-SKILLSETRA-Request-ID", crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`);

  try {
    const token = localStorage.getItem("skillsetra_access_token");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    // A deployment can offer Supabase accounts and no-sign-in demos simultaneously.
    // Only attach the demo header when the active browser identity is actually a demo.
    if (!token && DEMO_ENABLED) {
      const rawDemoUser = localStorage.getItem("skillsetra_demo_user");
      const demoSession = localStorage.getItem("skillsetra_demo_session_id");
      let demoUser: any = null;
      try { demoUser = rawDemoUser ? JSON.parse(rawDemoUser) : null; } catch { demoUser = null; }
      const validSession = Boolean(demoUser && typeof demoUser.id === "string" && demoUser.id === demoSession && (demoUser.isDemo === true || demoUser.email === ""));
      if (validSession && demoSession) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(demoSession)) throw new Error("Invalid demo session. Start a fresh demo and retry.");
        headers.set("X-SKILLSETRA-Demo-Session", demoSession);
      }
    }
  } catch {
    let hasToken = false;
    try { hasToken = Boolean(localStorage.getItem("skillsetra_access_token")); } catch { /* storage can be blocked by the browser */ }
    if (DEMO_ENABLED && !hasToken) throw new Error("Browser storage is unavailable. Enable site storage to use a demo workspace, then reload.");
  }

  const timeoutMs = timeoutFor(path, method);
  let attempt = 0;
  while (true) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(requestUrl, { ...options, method, headers, cache: "no-store", signal: controller.signal });
      if (!response.ok) {
        let data: any = {};
        try { data = await response.json(); } catch { /* non-JSON error response */ }
        const err: any = new Error(data?.error?.message || data?.detail || data?.message || `Request failed (${response.status})`);
        err.code = data?.error?.code || `HTTP_${response.status}`;
        err.status = response.status;
        err.requestId = data?.error?.request_id || response.headers.get("x-request-id") || undefined;
        const retryAfter = Number(response.headers.get("retry-after"));
        if (Number.isFinite(retryAfter) && retryAfter > 0) err.retryAfterMs = Math.min(5000, retryAfter * 1000);
        if (attempt < maxRetries && isSafeRetry(err)) {
          attempt += 1;
          await delay(Math.min(5000, Math.max(250 * (2 ** (attempt - 1)), Number(err.retryAfterMs) || 0)));
          continue;
        }
        throw err;
      }
      return await response.json() as T;
    } catch (caught: any) {
      const error = normalizeRequestError(caught);
      if (attempt < maxRetries && isSafeRetry(error)) {
        attempt += 1;
        await delay(Math.min(5000, Math.max(250 * (2 ** (attempt - 1)), Number(error.retryAfterMs) || 0)));
        continue;
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }
}

function requestLabel(path: string, method: string): string {
  const route = v1(path).toLowerCase();
  if (route.includes('/knowledge-check/submit')) return 'Scoring your four claim questions…';
  if (route.includes('/knowledge-check')) return 'Preparing your four claim questions…';
  if (route.includes('/review-prompt')) return 'Preparing the optional claim review…';
  if (route.includes('/ai-review')) return 'Saving the optional AI review…';
  if (route.includes('/evidence/claims')) return method === 'GET' ? 'Loading your claims…' : 'Recording your claim…';
  if (route.includes('/resume/draft')) return 'Saving your resume to your workspace…';
  if (route.includes('/projects/analyze')) return 'Analyzing and recording your project…';
  if (route.includes('/resume/extract') || route.includes('/resume/analyze')) return 'Processing your resume…';
  if (route.includes('/ai/ask') || route.includes('/reasoning/analyze') || route.includes('/assessment/generate')) return 'Preparing your AI analysis…';
  if (route.includes('/assessment/submit')) return 'Scoring your assessment…';
  if (route.includes('/challenge')) return 'Evaluating your practice…';
  if (method !== 'GET') return 'Saving your changes…';
  return 'Loading your workspace…';
}

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  if (typeof window === 'undefined') return apiRequest<T>(path, options);
  const method = String(options.method || 'GET').toUpperCase();
  const operationId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  const route = v1(path).toLowerCase();
  const busy = method !== 'GET' || /\/(?:ai|assessment\/(?:generate|submit)|projects\/analyze|github\/analyze|reasoning\/analyze|interpret\/analyze|resume\/(?:extract|analyze))/i.test(route);
  window.dispatchEvent(new CustomEvent('skillsetra:request-start', {detail:{id:operationId,method,path:route,busy,label:requestLabel(path,method)}}));
  try { return await apiRequest<T>(path, options); }
  finally { window.dispatchEvent(new CustomEvent('skillsetra:request-finish', {detail:{id:operationId}})); }
}

export { BASE };
