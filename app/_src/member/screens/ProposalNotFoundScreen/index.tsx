import { MemberHeader } from "@/app/_src/member/components/MemberHeader";

export function ProposalNotFoundScreen() {
  return (
    <>
      <MemberHeader />
      <main className="mx-auto grid max-w-xl gap-4 px-4 py-20 text-center">
        <h1 className="font-display text-4xl font-semibold">We can’t find this itinerary</h1>
        <p className="text-lg text-muted-foreground">
          The link may be incomplete. Please open it again from your email, or reply to your
          concierge and we’ll send a fresh one.
        </p>
      </main>
    </>
  );
}
