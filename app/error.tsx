"use client";

import { useEffect } from "react";
import { Button } from "@/app/_src/common/components/Button";

export default function DashboardError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto grid max-w-xl gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">The dashboard couldn’t load</h1>
      <p className="text-muted-foreground">
        Something went wrong while loading reservations and proposals. Nothing you saved was lost.
      </p>
      <div>
        <Button type="button" onClick={() => retry()}>
          Try again
        </Button>
      </div>
    </main>
  );
}
