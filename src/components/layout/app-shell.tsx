import { cookies } from 'next/headers';
import LayoutShell from './LayoutShell';

export async function AppShell({ children, branding }: { children: React.ReactNode; branding: any }) {
  const theme = (await cookies()).get('theme')?.value ?? 'system';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LayoutShell theme={theme} branding={branding}>{children}</LayoutShell>
    </div>
  );
}
