import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { createOrUpdateParty } from '@/features/parties/actions';

export default async function NewPartyPage() {
  await requireUser();

  async function createParty(formData: FormData) {
    'use server';
    await createOrUpdateParty(formData);
  }

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Create Party</p>
          <h1 className="mt-2 text-3xl font-semibold">Add a new customer or party</h1>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/parties">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to list
          </Link>
        </Button>
      </div>

      <form action={createParty} encType="multipart/form-data" autoComplete="off" className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">Party name</label>
            <input name="name" required className="w-full rounded-md border bg-background px-3 py-2" placeholder="Acme Poultry Ltd" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Phone</label>
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
            <label className="mb-2 block text-sm font-medium">Email</label>
            <input type="email" name="email" className="w-full rounded-md border bg-background px-3 py-2" placeholder="party@example.com" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Party type</label>
            <select name="partyType" defaultValue="BOTH" className="w-full rounded-md border bg-background px-3 py-2">
              <option value="CUSTOMER">Customer</option>
              <option value="PARTY">Party Supplier (Eggs & Chicken)</option>
              <option value="BOTH">Customer + Party Supplier</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Tax number</label>
            <input name="taxNumber" className="w-full rounded-md border bg-background px-3 py-2" placeholder="P0512345678" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Credit limit</label>
            <input type="number" step="0.01" min="0" name="creditLimit" defaultValue="" className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div className="md:col-span-2 rounded-xl border bg-background p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Opening Balance</p>
                <p className="text-xs text-muted-foreground">Creates an opening ledger entry when the amount is non-zero.</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Opening Balance Amount</label>
                <input type="number" step="0.01" min="0" name="openingBalanceAmount" defaultValue={0} className="w-full rounded-md border bg-background px-3 py-2" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Balance Type</label>
                <div className="flex flex-col gap-2 rounded-md border bg-background px-3 py-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="openingBalanceType" value="CUSTOMER_DUE" defaultChecked className="h-4 w-4" />
                    Customer Due
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="openingBalanceType" value="CUSTOMER_ADVANCE" className="h-4 w-4" />
                    Customer Advance
                  </label>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">Description</label>
                <textarea name="openingBalanceDescription" rows={2} className="w-full rounded-md border bg-background px-3 py-2" placeholder="Opening balance note..." />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-3">
            <input id="isActive" name="isActive" type="checkbox" defaultChecked className="h-4 w-4" />
            <label htmlFor="isActive" className="text-sm">Active party</label>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Party image</label>
            <input type="file" name="image" accept="image/*" className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Media name</label>
            <input name="mediaName" className="w-full rounded-md border bg-background px-3 py-2" placeholder="Media name" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Farm name</label>
            <input name="farmName" className="w-full rounded-md border bg-background px-3 py-2" placeholder="Farm name" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">Address</label>
            <textarea name="address" rows={3} className="w-full rounded-md border bg-background px-3 py-2" placeholder="Physical address or notes" />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="submit">Create Party</Button>
          <Button asChild variant="outline" type="button">
            <Link href="/dashboard/parties">Cancel</Link>
          </Button>
        </div>
      </form>
    </main>
  );
}
