import { requireUser } from '@/lib/auth';
import SettingsManager from '@/components/dashboard/SettingsManager';

export default async function SettingsPage() {
  const session = await requireUser();
  const userName = session.user.name ?? session.user.email ?? 'there';

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Settings</p>
        <h1 className="mt-2 text-3xl font-semibold">System Settings</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Welcome back, {userName}. Configure the core preferences and key system settings for your farm operations.</p>
      </div>

      <div className="mt-6">
        <SettingsManager />
      </div>
    </main>
  );
}
