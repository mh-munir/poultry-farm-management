import Link from 'next/link';
import { Building2, Camera, CircleDollarSign, DatabaseBackup, FileText, ShieldCheck, UserCog, Users2 } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import SettingsManager from '@/components/dashboard/SettingsManager';

const settingsSections = [
  {
    title: 'Company Profile',
    description: 'Manage the farm name, address, contact details, and business identity.',
    icon: Building2
  },
  {
    title: 'Logo',
    description: 'Upload and manage branding assets used on invoices and reports.',
    icon: Camera
  },
  {
    title: 'Invoice Settings',
    description: 'Configure invoice numbering, footer notes, and document formatting.',
    icon: FileText
  },
  {
    title: 'Tax',
    description: 'Set tax rules, rates, and tax-inclusive or exclusive pricing options.',
    icon: CircleDollarSign
  },
  {
    title: 'Currency',
    description: 'Choose the base currency and decimal display preferences.',
    icon: CircleDollarSign
  },
  {
    title: 'Backup',
    description: 'Create scheduled or manual backups for your farm data.',
    icon: DatabaseBackup
  },
  {
    title: 'Restore',
    description: 'Restore previous data snapshots safely when needed.',
    icon: DatabaseBackup
  },
  {
    title: 'Users',
    description: 'Manage staff accounts and their access to the system.',
    icon: Users2
  },
  {
    title: 'Roles',
    description: 'Create role-based access groups for different responsibilities.',
    icon: ShieldCheck
  },
  {
    title: 'Permissions',
    description: 'Fine-tune what each role can create, edit, view, or approve.',
    icon: UserCog
  }
];

export default async function SettingsPage() {
  const session = await requireUser();

  const userName = session.user.name ?? session.user.email ?? 'there';

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Settings</p>
        <h1 className="mt-2 text-3xl font-semibold">System Settings</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Welcome back, {userName}. Configure the core preferences and access controls for your farm operations.</p>
      </div>

      {/* Client-managed settings manager: choose which sections are enabled */}
      <div className="mt-6">
          <SettingsManager />
      </div>
    </main>
  );
}
