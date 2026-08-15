import Link from 'next/link';
import { cookies } from 'next/headers';
import { ArrowLeft } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { createOrUpdateParty } from '@/features/parties/actions';
import { getDictionary } from '@/i18n';
import { LOCALE_COOKIE, getLocaleFromValue } from '@/i18n/config';

export default async function NewPartyPage() {
  await requireUser();
  const cookieStore = await cookies();
  const locale = getLocaleFromValue(cookieStore.get(LOCALE_COOKIE)?.value ?? undefined);
  const dict = getDictionary(locale);

  async function createParty(formData: FormData) {
    'use server';
    await createOrUpdateParty(formData);
  }

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">{dict.pages.createPartyTitle}</p>
          <h1 className="mt-2 text-3xl font-semibold">{dict.pages.addNewCustomerOrParty}</h1>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/parties">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {dict.common.backToParties}
          </Link>
        </Button>
      </div>

      <form action={createParty} encType="multipart/form-data" autoComplete="off" className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">{dict.forms.partyNameLabel}</label>
            <input name="name" required className="w-full rounded-md border bg-background px-3 py-2" placeholder={dict.forms.acmePoultryExample} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">{dict.settings.phone}</label>
            <input
              name="phone"
              required
              inputMode="numeric"
              pattern="[0-9]{11}"
              maxLength={11}
              className="w-full rounded-md border bg-background px-3 py-2"
              placeholder="01712345678"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">{dict.common.email}</label>
            <input type="email" name="email" className="w-full rounded-md border bg-background px-3 py-2" placeholder={dict.forms.exampleEmailPlaceholder} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">{dict.forms.partyTypeLabel}</label>
            <select name="partyType" defaultValue="BOTH" className="w-full form-select">
              <option value="CUSTOMER">{dict.common.customer}</option>
              <option value="PARTY">{dict.forms.partySupplierType}</option>
              <option value="BOTH">{dict.forms.bothType}</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">{dict.settings.taxNumber}</label>
            <input name="taxNumber" className="w-full rounded-md border bg-background px-3 py-2" placeholder={dict.forms.taxNumberExample} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">{dict.settings.creditLimit}</label>
            <input type="number" step="0.01" min="0" name="creditLimit" defaultValue="" className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div className="md:col-span-2 rounded-xl border bg-background p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{dict.settings.openingBalance}</p>
                <p className="text-xs text-muted-foreground">{dict.settings.openingBalanceHint}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">{dict.settings.openingBalanceAmount}</label>
                <input type="number" step="0.01" min="0" name="openingBalanceAmount" defaultValue={0} className="w-full rounded-md border bg-background px-3 py-2" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">{dict.settings.balanceType}</label>
                <div className="flex flex-col gap-2 rounded-md border bg-background px-3 py-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="openingBalanceType" value="CUSTOMER_DUE" defaultChecked className="h-4 w-4" />
                    {dict.forms.customerDue}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="openingBalanceType" value="CUSTOMER_ADVANCE" className="h-4 w-4" />
                    {dict.forms.customerAdvance}
                  </label>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">{dict.forms.openingBalanceDescription}</label>
                <textarea name="openingBalanceDescription" rows={2} className="w-full rounded-md border bg-background px-3 py-2" placeholder={dict.forms.openingBalanceDescriptionPlaceholder} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-3">
            <input id="isActive" name="isActive" type="checkbox" defaultChecked className="h-4 w-4" />
            <label htmlFor="isActive" className="text-sm">{dict.common.activeParty}</label>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">{dict.settings.partyImage}</label>
            <input type="file" name="image" accept="image/*" className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">{dict.forms.mediaName}</label>
            <input name="mediaName" className="w-full rounded-md border bg-background px-3 py-2" placeholder={dict.forms.mediaNamePlaceholder} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">{dict.forms.farmNameLabel}</label>
            <input name="farmName" className="w-full rounded-md border bg-background px-3 py-2" placeholder={dict.forms.farmNamePlaceholder} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">{dict.settings.address}</label>
            <textarea name="address" rows={3} className="w-full rounded-md border bg-background px-3 py-2" placeholder={dict.forms.addressPlaceholder} />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="submit">{dict.common.create}</Button>
          <Button asChild variant="outline" type="button">
            <Link href="/dashboard/parties">{dict.common.cancel}</Link>
          </Button>
        </div>
      </form>
    </main>
  );
}
