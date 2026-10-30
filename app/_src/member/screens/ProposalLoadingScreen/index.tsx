import { MemberHeader } from "@/app/_src/member/components/MemberHeader";

export function ProposalLoadingScreen() {
  return (
    <>
      <MemberHeader />
      <div aria-busy="true" className="mx-auto max-w-[1100px] px-4 py-14 sm:px-6">
        <p role="status" className="sr-only">
          Loading your itinerary…
        </p>
        <div className="grid gap-4 motion-safe:animate-pulse">
          <div className="h-12 w-3/4 max-w-xl rounded bg-panel" />
          <div className="h-6 w-1/2 max-w-md rounded bg-panel" />
          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="h-80 rounded bg-panel" />
            <div className="h-64 rounded bg-panel" />
          </div>
        </div>
      </div>
    </>
  );
}
