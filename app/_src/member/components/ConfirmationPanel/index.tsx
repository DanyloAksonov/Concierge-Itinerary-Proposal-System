import { Check } from "lucide-react";
import Image from "next/image";
import type { ProposalDto } from "@/domain/proposals/service";
import { formatMoney, formatTimestamp, formatTripDate } from "@/lib/format";
import calmSea from "@/public/images/confirmation.webp";

type Props = Pick<ProposalDto, "member" | "concierge" | "reservation" | "totalCents" | "paidAt">;

/**
 * Shown once the proposal is paid — right after paying and on every later visit. It is the page's
 * main visual in that state, so its background is preloaded. The sea photo is decorative (alt="");
 * the text sits on a near-white card so its contrast doesn't depend on the image.
 */
export function ConfirmationPanel({ member, concierge, reservation, totalCents, paidAt }: Props) {
  const firstName = member.name.split(/\s+/)[0];

  return (
    <section
      aria-labelledby="confirmation-heading"
      className="relative grid min-h-[26rem] place-items-center overflow-hidden rounded-sm bg-panel px-4 py-12 sm:px-8"
    >
      <Image
        src={calmSea}
        alt=""
        fill
        preload
        placeholder="blur"
        sizes="(min-width: 1100px) 1052px, 100vw"
        className="object-cover"
      />
      <div className="relative grid max-w-xl justify-items-center gap-4 rounded-sm bg-white/90 px-6 py-10 text-center shadow-sm backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-500 sm:px-10">
        <span aria-hidden className="grid size-14 place-items-center rounded-full bg-gold text-ink">
          <Check className="size-7" />
        </span>
        <h2 id="confirmation-heading" className="font-display text-3xl font-semibold sm:text-4xl">
          Your itinerary is locked in
        </h2>
        <p className="text-lg text-muted-foreground">
          Thank you, {firstName}. {concierge.name} is now confirming every reservation and will be in
          touch before you arrive on {formatTripDate(reservation.arrivalDate)}.
        </p>
        <p className="text-sm">
          <span className="font-medium tabular-nums">{formatMoney(totalCents)}</span>
          {paidAt && (
            <span className="text-muted-foreground">
              {" "}
              · paid {formatTimestamp(paidAt, reservation.timeZone)} ({reservation.destination} time)
            </span>
          )}
        </p>
      </div>
    </section>
  );
}
