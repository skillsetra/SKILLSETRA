import {api} from "./api";

export type AIProviderId = "puter";
export const DEFAULT_AI_MODEL = "openai/gpt-oss-20b";
export type AIProviderInfo = {
  id: AIProviderId;
  name: string;
  tier: string;
  model: string;
  status: string;
  connected: boolean;
  server_side: boolean;
  models?: string[] | {id:string;label:string;recommended?:boolean}[];
};

export function extractPuterText(result:any):string {
  const raw = typeof result === "string" ? result : result?.message?.content ?? result?.text ?? result?.content ?? "";
  if (Array.isArray(raw)) return raw.map((x:any)=>x?.text ?? x?.content ?? "").join("");
  return String(raw || "").trim();
}

let puterScriptPromise: Promise<void> | null = null;

async function ensurePuterLoaded(): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("The AI service requires a browser session.");
  }
  if (window.puter?.ai?.chat) return;

  if (!puterScriptPromise) {
    puterScriptPromise = new Promise<void>((resolve, reject) => {
      let script = document.querySelector<HTMLScriptElement>('script[data-skillsetra-puter="true"]');
      // A failed or half-loaded tag must not trap future retries on an event that already fired.
      if (script?.dataset.failed === "true" || script?.dataset.loaded === "true") {
        script.remove();
        script = null;
      }
      const target = script || document.createElement("script");
      let settled = false;
      let watchdog = 0;
      const settle = (error?: Error) => {
        if (settled) return;
        settled = true;
        if (watchdog) window.clearTimeout(watchdog);
        target.removeEventListener("load", onLoad);
        target.removeEventListener("error", onError);
        if (error) {
          target.dataset.failed = "true";
          target.remove();
          reject(error);
        } else {
          target.dataset.loaded = "true";
          resolve();
        }
      };
      const onLoad = () => {
        // The script load event normally runs after it installs window.puter. A short
        // check avoids a false success if a proxy/extension served an unexpected body.
        if (window.puter?.ai?.chat) settle();
        else watchdog = window.setTimeout(() => settle(new Error("The AI service loaded without exposing its chat API. Check browser extensions or the network and retry.")), 1200);
      };
      const onError = () => settle(new Error("The AI service could not load. Check your connection and retry."));
      target.addEventListener("load", onLoad, { once: true });
      target.addEventListener("error", onError, { once: true });
      watchdog = window.setTimeout(() => settle(new Error("The AI service took too long to load. Check your connection and retry.")), 15000);
      if (!script) {
        target.src = "https://js.puter.com/v2/";
        target.async = true;
        target.dataset.skillsetraPuter = "true";
        document.head.appendChild(target);
      }
    });
  }

  const pending = puterScriptPromise;
  try {
    await pending;
  } catch (error) {
    if (puterScriptPromise === pending) puterScriptPromise = null;
    throw error;
  }
  if (!window.puter?.ai?.chat) {
    if (puterScriptPromise === pending) puterScriptPromise = null;
    const stale = document.querySelector<HTMLScriptElement>('script[data-skillsetra-puter="true"]');
    stale?.remove();
    throw new Error("The AI service loaded without exposing its chat API. Reload the page and retry the request.");
  }
}

export async function runPuter(prompt:string, _requestedModel?:string) {
  const activityId = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("skillsetra:request-start", {detail:{id:activityId,method:"AI",path:"puter-ai",busy:true,label:"Generating AI analysis…"}}));
  try {
    await ensurePuterLoaded();
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      let watchdog = 0;
      try {
        const request = Promise.resolve().then(() => window.puter!.ai.chat(prompt, {model:DEFAULT_AI_MODEL, temperature:0.35, normalize:true}));
        const result = await Promise.race([
          request,
          new Promise<never>((_, reject) => { watchdog = window.setTimeout(() => reject(new Error("The AI service did not respond within 25 seconds.")), 25000); })
        ]);
        const text = extractPuterText(result);
        if (text) return text;
        throw new Error("The AI service returned an empty response.");
      } catch (error:any) {
        lastError = error;
        const message = String(error?.message || error || "");
        const transient = /network|fetch|timeout|timed out|temporar|rate.?limit|429|502|503|504|empty response|connection reset|unavailable/i.test(message);
        const timedOut = /did not respond within/i.test(message);
        // Promise.race cannot cancel the provider's underlying request. Do not replay a
        // timed-out call and accidentally create overlapping billable/slow work.
        if (attempt === 0 && transient && !timedOut) await new Promise(resolve => window.setTimeout(resolve, 700));
        else break;
      } finally {
        if (watchdog) window.clearTimeout(watchdog);
      }
    }
    const detail = lastError instanceof Error ? lastError.message : "Check your connection and retry.";
    throw new Error(`The AI request did not complete. Your entered content has been retained. ${detail}`);
  } finally {
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("skillsetra:request-finish", {detail:{id:activityId}}));
  }
}

export async function getAIProviders() {
  return api<{default:string;providers:AIProviderInfo[]}>('/api/v1/ai/providers');
}
