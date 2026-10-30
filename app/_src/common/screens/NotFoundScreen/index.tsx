import Link from "next/link";

export function NotFoundScreen() {
  return (
    <main className="mx-auto grid max-w-xl gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">This address doesn’t match any page.</p>
      <p>
        <Link href="/concierge" className="font-medium text-gold-text underline underline-offset-4">
          Go to the concierge dashboard
        </Link>
      </p>
    </main>
  );
}
