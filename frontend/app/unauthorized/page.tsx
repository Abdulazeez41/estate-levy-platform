export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="rounded-[24px] border border-line bg-panel p-10 text-center shadow-panel">
        <h1 className="font-heading text-4xl text-ink">Unauthorized</h1>
        <p className="mt-3 max-w-md text-ink-soft">Your current session does not have access to this dashboard.</p>
      </div>
    </main>
  );
}
