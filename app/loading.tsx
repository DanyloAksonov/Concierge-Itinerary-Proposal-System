// Also the Suspense boundary that lets the dashboard read uncached data (see app/page.tsx).
export default function DashboardLoading() {
  return (
    <div aria-busy="true" className="animate-pulse motion-reduce:animate-none">
      <p role="status" className="sr-only">
        Loading the dashboard…
      </p>
      <div className="h-10 border-b bg-panel" />
      <div className="border-b">
        <div className="mx-auto flex max-w-6xl gap-6 px-4 py-3 sm:px-6">
          <div className="h-6 w-40 rounded bg-panel" />
          <div className="h-6 w-96 max-w-full rounded bg-panel" />
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 sm:px-6">
        <div className="h-28 rounded-lg bg-panel" />
        <div className="h-40 rounded-lg bg-panel" />
        <div className="h-48 rounded-lg bg-panel" />
      </div>
    </div>
  );
}
