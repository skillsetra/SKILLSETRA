import { mkdir, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isLoopbackHost(host: string) {
  return /^(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(host.trim());
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  const host = request.headers.get("host") || "";
  const origin = request.headers.get("origin") || "";
  if (!isLoopbackHost(host)) return new Response(null, { status: 403 });
  if (origin) {
    try {
      const url = new URL(origin);
      if (!isLoopbackHost(url.host) || url.port !== "3000") return new Response(null, { status: 403 });
    } catch { return new Response(null, { status: 403 }); }
  }

  let payload: { id?: unknown; action?: unknown };
  try { payload = await request.json(); } catch { return new Response(null, { status: 400 }); }
  const id = payload?.id;
  const action = payload?.action;
  if (typeof id !== "string" || !/^[a-f0-9-]{16,64}$/i.test(id)) return new Response(null, { status: 400 });
  if (action !== "heartbeat" && action !== "close") return new Response(null, { status: 400 });

  const stateDir = resolve(process.cwd(), "..", ".skillsetra-run", "browser-sessions");
  const marker = resolve(stateDir, `browser-${id}.txt`);
  try {
    if (action === "close") {
      try { await unlink(marker); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    } else {
      await mkdir(stateDir, { recursive: true });
      await writeFile(marker, `${Date.now()}\n`, { encoding: "utf8", mode: 0o600 });
    }
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch {
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
