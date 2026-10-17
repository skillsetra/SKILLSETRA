// Shared scroll helpers for the main document and any nested scroll container.
// The product shell may scroll the window or a route-local panel depending on viewport/layout,
// so target navigation must find the nearest scrollable ancestor instead of assuming window.

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

function headerOffset(extra = 16): number {
  if (typeof document === "undefined") return extra;
  const bar = document.querySelector<HTMLElement>(".product-topbar");
  const height = bar && getComputedStyle(bar).position === "fixed" ? bar.offsetHeight : 0;
  return height + extra;
}

function nearestScrollableAncestor(el: Element): HTMLElement | null {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  let parent = el.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const style = window.getComputedStyle(parent);
    const canScroll = /(auto|scroll|overlay)/.test(`${style.overflowY} ${style.overflow}`);
    if (canScroll && parent.scrollHeight > parent.clientHeight + 2) return parent;
    parent = parent.parentElement;
  }
  return null;
}

/** Scroll a target into view below the fixed header, supporting both document and nested scrollers. */
export function scrollToElement(el: Element | null | undefined, options: { extra?: number; instant?: boolean } = {}): void {
  if (!el || typeof window === "undefined") return;
  const behavior: ScrollBehavior = options.instant || prefersReducedMotion() ? "auto" : "smooth";
  // Two frames allow React to commit the next question/result card before measuring it.
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    if (!el.isConnected) return;
    const extra = options.extra ?? 16;
    const rect = el.getBoundingClientRect();
    const scroller = nearestScrollableAncestor(el);
    if (scroller) {
      const scrollerRect = scroller.getBoundingClientRect();
      const top = scroller.scrollTop + rect.top - scrollerRect.top - extra;
      scroller.scrollTo({ top: Math.max(0, top), behavior });
      return;
    }
    const top = rect.top + window.scrollY - headerOffset(extra);
    window.scrollTo({ top: Math.max(0, top), behavior });
  }));
}

/** Scroll to the very top of the page (used after a result or a new step is shown). */
export function scrollToTop(options: { instant?: boolean } = {}): void {
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(() => {
    const behavior: ScrollBehavior = options.instant || prefersReducedMotion() ? "auto" : "smooth";
    window.scrollTo({ top: 0, behavior });
  });
}

/** Scroll to an element by id (no-op when it does not exist). */
export function scrollToId(id: string, options: { extra?: number; instant?: boolean } = {}): void {
  if (typeof document === "undefined") return;
  scrollToElement(document.getElementById(id), options);
}

/** Move keyboard/screen-reader focus to a result region without causing an extra browser scroll. */
export function focusWithoutScroll(el: HTMLElement | null | undefined): void {
  if (!el) return;
  try { el.focus({ preventScroll: true }); } catch { /* focus options unsupported – ignore */ }
}
