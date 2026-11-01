/**
 * Focuses the element with `id` as soon as it is in the DOM — for focus targets that only appear
 * after `router.refresh()` re-renders the page. Gives up silently after `timeoutMs`.
 */
export function focusWhenRendered(id: string, timeoutMs = 5000): void {
  const focus = (element: HTMLElement) => {
    element.focus({ preventScroll: true });
    element.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const existing = document.getElementById(id);
  if (existing) return focus(existing);

  const observer = new MutationObserver(() => {
    const element = document.getElementById(id);
    if (!element) return;
    observer.disconnect();
    focus(element);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), timeoutMs);
}
