/** Shown when a concierge opens a draft "as the member": nothing here is actionable yet. */
export function PreviewBanner() {
  return (
    <div role="note" className="border-b bg-ink text-white">
      <p className="mx-auto max-w-[1100px] px-4 py-2 text-sm sm:px-6">
        <span className="font-medium">Preview</span> — this proposal hasn’t been sent to the member
        yet, so approving and paying are turned off.
      </p>
    </div>
  );
}
