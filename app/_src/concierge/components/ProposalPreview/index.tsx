"use client";

import type { ReactNode } from "react";
import { Button } from "@/app/_src/common/components/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/_src/common/components/Dialog";
import { formatClockTime, formatMoney, formatShortDay } from "@/lib/format";
import { CATEGORIES } from "@/domain/proposals/categories";
import { totalCents } from "@/domain/proposals/rules";
import type { ReservationDto } from "@/domain/reservations/service";
import type { DraftItem } from "../ItemList";

type Props = Pick<ReservationDto, "member"> & {
  /** The button that opens the dialog; Radix returns focus to it on close. */
  trigger: ReactNode;
  /** Lets the caller send focus elsewhere on close (e.g. when the trigger is disabled after sending). */
  onCloseAutoFocus?: (event: Event) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: DraftItem[];
  note: string;
  sending: boolean;
  onSend: () => void;
};

/** What the member will receive, shown before anything is sent. */
export function ProposalPreview({
  trigger,
  onCloseAutoFocus,
  open,
  onOpenChange,
  member,
  items,
  note,
  sending,
  onSend,
}: Props) {
  const days = Map.groupBy(items, (item) => item.scheduledAt.slice(0, 10));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent onCloseAutoFocus={onCloseAutoFocus} className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Preview: itinerary for {member.name}</DialogTitle>
          <DialogDescription>
            Check the details before sending. The member link is emailed to {member.email}.
          </DialogDescription>
        </DialogHeader>

        {note.trim() && (
          <blockquote className="rounded-md bg-panel p-3 text-sm whitespace-pre-line">
            {note.trim()}
          </blockquote>
        )}

        <div className="grid gap-4">
          {[...days].map(([day, dayItems]) => (
            <section key={day} aria-label={formatShortDay(day)}>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {formatShortDay(day)}
              </h3>
              <ul className="mt-1 divide-y">
                {dayItems.map((item) => (
                  <li key={item.key} className="flex gap-3 py-2 text-sm">
                    <span className="w-16 shrink-0 text-muted-foreground tabular-nums">
                      {formatClockTime(item.scheduledAt)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium break-words">{item.title}</p>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {CATEGORIES[item.category].label}
                      </p>
                      {item.description && (
                        <p className="mt-1 text-muted-foreground break-words">{item.description}</p>
                      )}
                    </div>
                    <span className="tabular-nums">{formatMoney(item.priceCents)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="flex items-baseline justify-between border-t pt-3">
          <span className="text-sm text-muted-foreground">Estimated total</span>
          <span className="text-lg font-semibold tabular-nums">
            {formatMoney(totalCents(items))}
          </span>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={sending}>
              Back to editing
            </Button>
          </DialogClose>
          <Button type="button" onClick={onSend} disabled={sending}>
            {sending ? "Sending…" : `Send to ${member.email}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
