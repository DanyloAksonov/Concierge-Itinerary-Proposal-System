export function NoReservationScreen() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold">No upcoming reservation</h1>
      <p className="mt-2 text-muted-foreground">
        The database has no reservation yet. Run <code>npm run db:seed</code> and reload.
      </p>
    </main>
  );
}
