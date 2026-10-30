"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";
import { apiRequest, errorMessage } from "@/app/_src/common/utils/api-client";
import { copyText } from "@/app/_src/common/utils/copy-text";
import { memberLink } from "@/app/_src/concierge/utils/member-link";
import { Button } from "@/app/_src/common/components/Button";
import { Label } from "@/app/_src/common/components/Label";
import { Textarea } from "@/app/_src/common/components/Textarea";
import { stayDays } from "@/domain/proposals/rules";
import type { ProposalDto } from "@/domain/proposals/service";
import type { ItemInput } from "@/domain/proposals/validation";
import type { ReservationDto } from "@/domain/reservations/service";
import { ItemForm } from "../ItemForm";
import { type DraftItem, ItemList } from "../ItemList";
import { ProposalPreview } from "../ProposalPreview";

/** Builds a new proposal locally, then saves it as a draft or previews and sends it. */
export function ProposalBuilder({ reservation, member }: ReservationDto) {
  const router = useRouter();
  const noteId = useId();
  const [items, setItems] = useState<DraftItem[]>([]);
  const [note, setNote] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [busy, setBusy] = useState<"saving" | "sending" | null>(null);


  function addItem(item: ItemInput) {
    const next = [...items, { ...item, key: crypto.randomUUID() }];
    next.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    setItems(next);
  }

  function reset() {
    setItems([]);
    setNote("");
    setPreviewOpen(false);
  }

  const createDraft = () =>
    apiRequest<ProposalDto>("/api/proposals", {
      method: "POST",
      body: {
        reservationId: reservation.id,
        note,
        items: items.map(({ category, title, description, scheduledAt, priceCents }) => ({
          category,
          title,
          description,
          scheduledAt,
          priceCents,
        })),
      },
    });

  async function saveDraft() {
    setBusy("saving");
    try {
      await createDraft();
      toast.success("Draft saved", { description: "You can send it from the proposals list." });
      reset();
      router.refresh();
    } catch (error) {
      toast.error("Couldn't save the draft", { description: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    setBusy("sending");
    let draft: ProposalDto | null = null;
    try {
      draft = await createDraft();
      await apiRequest(`/api/proposals/${draft.id}/send`, { method: "POST" });
      const link = memberLink(draft.id);
      toast.success(`Sent to ${member.name}`, {
        description: `The itinerary link was emailed to ${member.email}.`,
        action: { label: "Copy link", onClick: () => void copyText(link) },
      });
      reset();
    } catch (error) {
      if (draft) {
        // Created but not sent: keep the work, point the concierge to the list.
        toast.error("Saved as a draft, but sending failed", {
          description: `${errorMessage(error)} You can send it from the proposals list.`,
        });
        reset();
      } else {
        toast.error("Couldn't send the proposal", { description: errorMessage(error) });
      }
    } finally {
      setBusy(null);
      router.refresh();
    }
  }

  const canSubmit = items.length > 0 && busy === null;

  return (
    <section aria-labelledby="builder-heading" className="grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="builder-heading" className="text-base font-semibold">
          New proposal
        </h2>
        <p className="text-sm text-muted-foreground">
          Items can be scheduled from arrival to departure day, in local time.
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
        {items.length === 0 && (
          <p className="mr-auto text-sm text-muted-foreground">Add at least one item to save or send.</p>
        )}
        <Button type="button" variant="outline" onClick={saveDraft} disabled={!canSubmit}>
          {busy === "saving" ? "Saving…" : "Save draft"}
        </Button>
        <Button type="button" onClick={() => setPreviewOpen(true)} disabled={!canSubmit}>
          Preview & send
        </Button>
      </div>

      <ProposalPreview
        open={previewOpen}
        onOpenChange={(open) => busy !== "sending" && setPreviewOpen(open)}
        member={member}
        items={items}
        note={note}
        sending={busy === "sending"}
        onSend={send}
      />
    </section>
  );
}
