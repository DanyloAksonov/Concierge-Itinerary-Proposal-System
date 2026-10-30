import { CATEGORIES } from "@/domain/proposals/categories";
import { stayDays } from "@/domain/proposals/rules";
import type { ProposalDto } from "@/domain/proposals/service";
import { formatClockTime, formatLongDay, formatMoney } from "@/lib/format";

type Props = Pick<ProposalDto, "items" | "reservation">;

/** The itinerary day by day; days without plans are left out rather than shown empty. */
export function DayTimeline({ items, reservation }: Props) {
  const allDays = stayDays(reservation);
  const byDay = Map.groupBy(items, (item) => item.scheduledAt.slice(0, 10));

  return (
    <section aria-labelledby="itinerary-heading" className="grid gap-8 border-t py-10">
      <h2
        id="itinerary-heading"
        className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground"
      >
        Your itinerary
      </h2>

      {[...byDay].map(([day, dayItems]) => (
        <section key={day} aria-labelledby={`day-${day}`} className="grid gap-2">
          <h3 id={`day-${day}`} className="font-display text-2xl font-semibold">
            Day {allDays.indexOf(day) + 1}
            <span className="text-muted-foreground"> · {formatLongDay(day)}</span>
          </h3>
          <ul className="divide-y">
            {dayItems.map((item) => (
              <li
                key={item.id}
                className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] gap-x-4 gap-y-1 py-5"
              >
                <span className="pt-0.5 text-sm text-muted-foreground tabular-nums">
                  {formatClockTime(item.scheduledAt)}
                </span>
                <div className="grid gap-1">
                  <p className="text-lg font-medium leading-snug break-words">{item.title}</p>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-gold-text">
                    {CATEGORIES[item.category].label}
                  </p>
                  {item.description && (
                    <p className="text-muted-foreground break-words">{item.description}</p>
                  )}
                </div>
                <span className="pt-0.5 tabular-nums">{formatMoney(item.priceCents)}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}
