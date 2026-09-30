export default function RequestDetailLoading() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4">
      <div className="h-8 w-32 animate-pulse rounded bg-muted" />
      <div className="space-y-3 border rounded-lg p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </main>
  );
}
