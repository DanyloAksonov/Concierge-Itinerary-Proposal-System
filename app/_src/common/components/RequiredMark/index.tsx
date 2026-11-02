/**
 * Visual "required" asterisk for a field label. Hidden from screen readers: the field itself
 * carries `aria-required`, so they announce "required" without reading out a star.
 */
export function RequiredMark() {
  // -ml-1 offsets part of the Label's flex gap, so the star sits next to its word.
  return (
    <span aria-hidden className="-ml-1 text-destructive">
      *
    </span>
  );
}
