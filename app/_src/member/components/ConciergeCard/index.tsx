import type { ConciergeDto } from "@/domain/concierges/service";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export function ConciergeCard({ concierge }: { concierge: ConciergeDto }) {
  return (
    <section aria-labelledby="concierge-heading" className="grid gap-4 border-b pb-6">
      <h2
        id="concierge-heading"
        className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground"
      >
        Your concierge
      </h2>
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className="grid size-14 shrink-0 place-items-center rounded-full bg-panel font-display text-xl font-semibold"
        >
          {initials(concierge.name)}
        </span>
        <div className="min-w-0">
          <p className="font-medium">{concierge.name}</p>
          <p className="text-sm text-muted-foreground">{concierge.title}</p>
        </div>
      </div>
      <dl className="grid gap-1 text-sm">
        <div className="flex gap-2">
          <dt className="sr-only">Email</dt>
          <dd className="min-w-0 break-all">
            <a href={`mailto:${concierge.email}`} className="underline-offset-4 hover:underline">
              {concierge.email}
            </a>
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="sr-only">Phone</dt>
          <dd>
            <a href={`tel:${concierge.phone.replace(/\s/g, "")}`} className="underline-offset-4 hover:underline">
              {concierge.phone}
            </a>
          </dd>
        </div>
      </dl>
    </section>
  );
}
