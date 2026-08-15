import { cookies } from 'next/headers';
import { ServiceUnavailableCard } from '@/components/ui/service-unavailable-card';
import { LOCALE_COOKIE, getLocaleFromValue } from '@/i18n/config';
import { getDictionary } from '@/i18n';

export default async function UnauthorizedPage() {
  const locale = getLocaleFromValue((await cookies()).get(LOCALE_COOKIE)?.value ?? undefined);
  const dict = getDictionary(locale);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-6 py-10">
      <div className="w-full rounded-xl border bg-card p-8 text-center shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">{dict.common.accessDenied}</p>
        <h1 className="mt-2 text-3xl font-semibold">{dict.common.noPermission}</h1>
        <p className="mt-3 text-muted-foreground">
          {dict.common.signInRequired}
        </p>
        <div className="mt-6 text-left">
          <ServiceUnavailableCard
            title={dict.common.accessChecksTitle}
            description={dict.common.accessChecksDescription}
          />
        </div>
      </div>
    </main>
  );
}
