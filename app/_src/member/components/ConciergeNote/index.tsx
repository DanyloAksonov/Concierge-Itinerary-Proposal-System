type Props = { note: string; conciergeName: string };

export function ConciergeNote({ note, conciergeName }: Props) {
  return (
    <section aria-labelledby="note-heading" className="grid gap-4 border-t py-10">
      <h2
        id="note-heading"
        className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground"
      >
        A note from your concierge
      </h2>
      <blockquote className="font-display text-2xl leading-snug whitespace-pre-line">{note}</blockquote>
      <p className="text-sm text-muted-foreground">— {conciergeName}</p>
    </section>
  );
}
