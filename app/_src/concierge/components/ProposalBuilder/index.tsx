"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { ApiError, apiRequest, errorMessage } from "@/app/_src/common/utils/api-client";
import { copyText } from "@/app/_src/common/utils/copy-text";
import { focusWhenRendered } from "@/app/_src/common/utils/focus-when-rendered";
import { memberLink } from "@/app/_src/concierge/utils/member-link";
import { Button } from "@/app/_src/common/components/Button";
import { Input } from "@/app/_src/common/components/Input";
import { Label } from "@/app/_src/common/components/Label";
import { RequiredMark } from "@/app/_src/common/components/RequiredMark";
import { Textarea } from "@/app/_src/common/components/Textarea";
import { stayDays } from "@/domain/proposals/rules";
import type { ProposalDto } from "@/domain/proposals/service";
import type { ItemInput } from "@/domain/proposals/validation";
import type { ReservationDto } from "@/domain/reservations/service";
import { ItemForm } from "../ItemForm";
import { type DraftItem, ItemList } from "../ItemList";
import { ProposalPreview } from "../ProposalPreview";

// Different ids per mode, so focus can wait for the *other* builder to appear after a switch.
export const NEW_HEADING_ID = "builder-heading";
export const EDIT_HEADING_ID = "builder-heading-edit";

type Props = ReservationDto & {
  /** A draft to edit (from `/concierge?edit=<id>`); without it the builder starts a new proposal. */
  editing?: ProposalDto | null;
};

const toDraftItem = (item: ProposalDto["items"][number]): DraftItem => ({
  key: String(item.id),
  category: item.category,
  title: item.title,
  description: item.description,
  scheduledAt: item.scheduledAt,
  priceCents: item.priceCents,
});

/** Builds a new proposal or edits a draft, then saves it or previews and sends it. */
export function ProposalBuilder({ reservation, member, editing }: Props) {
  const router = useRouter();
  const noteId = useId();
  const titleId = useId();
  // No default title: the concierge names each proposal ("Anniversary week"). A generic default read
  // twice on the member page and in the email subject ("Punta Mita itinerary: your itinerary…").
  const [title, setTitle] = useState(editing?.title ?? "");
  const [items, setItems] = useState<DraftItem[]>(() => editing?.items.map(toDraftItem) ?? []);
  const [note, setNote] = useState(editing?.note ?? "");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [busy, setBusy] = useState<"saving" | "sending" | null>(null);
  // After a save or send the buttons disable themselves, so focus needs somewhere deliberate to go.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusHeadingOnClose = useRef(false);

  function addItem(item: ItemInput) {
    const next = [...items, { ...item, key: crypto.randomUUID() }];
    next.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    setItems(next);
  }

  function reset() {
    setTitle("");
    setItems([]);
    setNote("");
    setPreviewOpen(false);
  }

  /** Back to an empty builder: the page re-renders without `?edit`, then focus lands on it. */
  function leaveEditMode() {
    router.replace("/concierge", { scroll: false });
    focusWhenRendered(NEW_HEADING_ID);
  }

  const content = () => ({
    title,
    note,
    items: items.map(({ category, title, description, scheduledAt, priceCents }) => ({
      category,
      title,
      description,
      scheduledAt,
      priceCents,
    })),
  });

  const save = () =>
    editing
      ? apiRequest<ProposalDto>(`/api/proposals/${editing.id}`, { method: "PATCH", body: content() })
      : apiRequest<ProposalDto>("/api/proposals", {
          method: "POST",
          body: { reservationId: reservation.id, ...content() },
        });

  async function saveDraft() {
    setBusy("saving");
    try {
      await save();
      toast.success(editing ? "Draft updated" : "Draft saved", {
        description: "You can send it from the proposals list.",
      });
      if (editing) return leaveEditMode();
      reset();
      headingRef.current?.focus();
      router.refresh();
    } catch (error) {
      toast.error("Couldn't save the draft", { description: errorMessage(error) });
      // e.g. sent from another tab meanwhile: it can't be edited any more.
      if (editing && error instanceof ApiError && error.code === "CONFLICT") leaveEditMode();
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    setBusy("sending");
    let draft: ProposalDto | null = null;
    try {
      draft = await save();
      await apiRequest(`/api/proposals/${draft.id}/send`, { method: "POST" });
      const link = memberLink(draft.id);
      toast.success(`Sent to ${member.name}`, {
        description: `The itinerary link was emailed to ${member.email}.`,
        action: { label: "Copy link", onClick: () => void copyText(link) },
      });
    } catch (error) {
      toast.error(draft ? "Saved as a draft, but sending failed" : "Couldn't send the proposal", {
        description: draft
          ? `${errorMessage(error)} You can send it from the proposals list.`
          : errorMessage(error),
      });
      if (!draft) return; // nothing saved: keep the builder as it is so nothing is lost
    } finally {
      setBusy(null);
    }
    // Saved (and sent, or at least saved as a draft): start over.
    if (editing) return leaveEditMode();
    focusHeadingOnClose.current = true;
    reset();
    router.refresh();
  }

  const missing = [
    title.trim() === "" && "give the proposal a title",
    items.length === 0 && "add at least one item",
  ]
    .filter(Boolean)
    .join(" and ");
  const canSubmit = !missing && busy === null;
  const headingId = editing ? EDIT_HEADING_ID : NEW_HEADING_ID;

  return (
    <section aria-labelledby={headingId} className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            className="text-base font-semibold focus:outline-none"
          >
            {editing ? "Editing draft" : "New proposal"}
          </h2>
          {editing && (
            <Link
              href="/concierge"
              scroll={false}
              onClick={() => focusWhenRendered(NEW_HEADING_ID)}
              className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Cancel editing
            </Link>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Items can be scheduled from arrival to departure day, in local time.{" "}
          {/* Hidden from screen readers: the fields announce "required" themselves. */}
          <span aria-hidden className="whitespace-nowrap">
            <span className="text-destructive">*</span> Required
          </span>
        </p>
      </div>

      <div className="grid gap-1 sm:max-w-md">
        <Label htmlFor={titleId}>
          Proposal title <RequiredMark />
        </Label>
        <Input
          id={titleId}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-required
          placeholder="e.g. Anniversary week"
          maxLength={120}
          aria-describedby={`${titleId}-hint`}
        />
        <p id={`${titleId}-hint`} className="text-xs text-muted-foreground">
          Shown in the proposals list, to {member.name} and in the email subject.
        </p>
      </div>

      <div className="rounded-lg border p-4">
        <ItemForm days={stayDays(reservation)} onAdd={addItem} />
      </div>

      <ItemList
        items={items}
        onRemove={(key) => setItems(items.filter((item) => item.key !== key))}
      />

      <div className="grid gap-1">
        <Label htmlFor={noteId}>
          Note to {member.name} <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id={noteId}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="A personal welcome or anything they should know"
          maxLength={2000}
          rows={2}
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {missing && (
          <p className="mr-auto text-sm text-muted-foreground">
            To save or send, {missing}.
          </p>
        )}
        <Button type="button" variant="outline" onClick={saveDraft} disabled={!canSubmit}>
          {busy === "saving" ? "Saving…" : editing ? "Save changes" : "Save draft"}
        </Button>
        <ProposalPreview
          trigger={
            <Button type="button" disabled={!canSubmit}>
              Preview & send
            </Button>
          }
          open={previewOpen}
          onOpenChange={(open) => busy !== "sending" && setPreviewOpen(open)}
          onCloseAutoFocus={(event) => {
            // Radix returns focus to the trigger by default; after sending it's disabled.
            if (!focusHeadingOnClose.current) return;
            event.preventDefault();
            focusHeadingOnClose.current = false;
            headingRef.current?.focus();
          }}
          member={member}
          title={title}
          items={items}
          note={note}
          sending={busy === "sending"}
          onSend={send}
        />
      </div>
    </section>
  );
}
