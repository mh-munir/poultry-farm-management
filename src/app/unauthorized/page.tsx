import { ServiceUnavailableCard } from '@/components/ui/service-unavailable-card';

export default function UnauthorizedPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-6 py-10">
      <div className="w-full rounded-xl border bg-card p-8 text-center shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Access denied</p>
        <h1 className="mt-2 text-3xl font-semibold">You do not have permission to view this page.</h1>
        <p className="mt-3 text-muted-foreground">
          Sign in with an account that has the required role to continue.
        </p>
        <div className="mt-6 text-left">
          <ServiceUnavailableCard
            title="Access checks may be affected"
            description="If the database is temporarily unavailable, permission checks can fail. Please wait a moment and try again."
          />
        </div>
      </div>
    </main>
  );
}
