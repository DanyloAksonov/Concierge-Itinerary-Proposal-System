import { ConciergeCard } from "@/app/_src/member/components/ConciergeCard";
import { ConciergeNote } from "@/app/_src/member/components/ConciergeNote";
import { ConfirmationPanel } from "@/app/_src/member/components/ConfirmationPanel";
import { DayTimeline } from "@/app/_src/member/components/DayTimeline";
import { Gallery } from "@/app/_src/member/components/Gallery";
import { ItineraryHero } from "@/app/_src/member/components/ItineraryHero";
import { MemberHeader } from "@/app/_src/member/components/MemberHeader";
import { MobileActionBar } from "@/app/_src/member/components/MobileActionBar";
import { PreviewBanner } from "@/app/_src/member/components/PreviewBanner";
import { SummaryCard } from "@/app/_src/member/components/SummaryCard";
import type { ProposalDto } from "@/domain/proposals/service";

/** The member's itinerary page for any status: preview (draft), actions (sent/approved), confirmation (paid). */
export function ProposalScreen({ proposal }: { proposal: ProposalDto }) {
  const actionable = proposal.status === "sent" || proposal.status === "approved";

  return (
    <>
      <MemberHeader />
      {proposal.status === "draft" && <PreviewBanner />}

      {/* Bottom padding on phones keeps content clear of the fixed action bar. */}
      <main className={actionable ? "pb-32 lg:pb-16" : "pb-16"}>
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6">
          {/* Once paid, the confirmation is the page's main visual instead of the gallery. */}
          {proposal.status !== "paid" && <Gallery />}
          <ItineraryHero
            title={proposal.title}
            reservation={proposal.reservation}
            member={proposal.member}
            items={proposal.items}
          />

          {proposal.status === "paid" && (
            <div className="mb-10">
              <ConfirmationPanel
                member={proposal.member}
                concierge={proposal.concierge}
                reservation={proposal.reservation}
                totalCents={proposal.totalCents}
                paidAt={proposal.paidAt}
              />
            </div>
          )}

          <div className="grid gap-x-16 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0">
              {proposal.note && (
                <ConciergeNote note={proposal.note} conciergeName={proposal.concierge.name} />
              )}
              <DayTimeline items={proposal.items} reservation={proposal.reservation} />
            </div>

            <aside className="grid content-start gap-8 border-t py-10 lg:sticky lg:top-8 lg:self-start lg:border-t-0">
              <ConciergeCard concierge={proposal.concierge} />
              <SummaryCard
                id={proposal.id}
                status={proposal.status}
                totalCents={proposal.totalCents}
                items={proposal.items}
              />
            </aside>
          </div>
        </div>
      </main>

      {actionable && (
        <MobileActionBar id={proposal.id} status={proposal.status} totalCents={proposal.totalCents} />
      )}
    </>
  );
}
