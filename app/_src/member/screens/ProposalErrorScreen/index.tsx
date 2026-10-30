"use client";

import { useEffect } from "react";
import { Button } from "@/app/_src/common/components/Button";
import { MemberHeader } from "@/app/_src/member/components/MemberHeader";

export function ProposalErrorScreen({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <MemberHeader />
      <main className="mx-auto grid max-w-xl justify-items-center gap-4 px-4 py-20 text-center">
        <h1 className="font-display text-4xl font-semibold">Your itinerary didn’t load</h1>
        <p className="text-lg text-muted-foreground">
          Something went wrong on our side. Nothing has changed with your plans.
        </p>
        <Button type="button" onClick={() => retry()} className="h-11 bg-gold px-6 text-ink hover:bg-gold/85">
          Try again
        </Button>
      </main>
    </>
  );
}
