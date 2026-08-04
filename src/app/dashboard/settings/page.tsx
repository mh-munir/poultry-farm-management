import { requireUser } from '@/lib/auth';
import SettingsManager from '@/components/dashboard/SettingsManager';
import { env, getSmsProviderStatusMessage, isSmsProviderConfigured } from '@/lib/env';

export default async function SettingsPage() {
  const session = await requireUser();
  const userName = session.user.name ?? session.user.email ?? 'there';
  const smsConfigured = isSmsProviderConfigured();
  const smsStatusMessage = getSmsProviderStatusMessage();

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Settings</p>
        <h1 className="mt-2 text-3xl font-semibold">System Settings</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Welcome back, {userName}. Configure the core preferences and key system settings for your farm operations.</p>
      </div>

      {(!smsConfigured || env.SMS_PROVIDER?.trim().toLowerCase() === 'mock') && (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-900 shadow-sm">
          <p className="font-semibold">SMS provider is not configured.</p>
          <p className="mt-1 text-sm">{smsStatusMessage}</p>
          <p className="mt-2 text-sm text-rose-700">Set <code>SMS_PROVIDER=bulksmsbd</code> and configure <code>BULKSMSBD_API_KEY</code>, <code>BULKSMSBD_SENDER_ID</code>, and <code>BULKSMSBD_API_URL</code> to enable SMS notifications.</p>
        </div>
      )}

      <div className="mt-6">
        <SettingsManager />
      </div>
    </main>
  );
}
