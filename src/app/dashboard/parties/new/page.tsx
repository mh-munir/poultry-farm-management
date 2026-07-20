import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { createOrUpdateParty } from '@/features/parties/actions';

export default async function NewPartyPage() {
  await requireUser();

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Create Party</p>
          <h1 className="mt-2 text-3xl font-semibold">Add a new customer or supplier</h1>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/parties">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to list
          </Link>
        </Button>
      </div>

      <form action={createOrUpdateParty} autoComplete="off" className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
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
              <option value="SUPPLIER">Supplier</option>
              <option value="BOTH">Both</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Tax number</label>
            <input name="taxNumber" className="w-full rounded-md border bg-background px-3 py-2" placeholder="P0512345678" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Credit limit</label>
            <input type="number" step="0.01" min="0" name="creditLimit" defaultValue="0" className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Opening balance</label>
            <input type="number" step="0.01" name="openingBalance" defaultValue="0" className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-3">
            <input id="isActive" name="isActive" type="checkbox" defaultChecked className="h-4 w-4" />
            <label htmlFor="isActive" className="text-sm">Active party</label>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Feed quantity</label>
            <input type="number" step="0.01" min="0" name="feedQuantity" className="w-full rounded-md border bg-background px-3 py-2" placeholder="0" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Feed price</label>
            <input type="number" step="0.01" min="0" name="feedPrice" className="w-full rounded-md border bg-background px-3 py-2" placeholder="0.00" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Feed name</label>
            <input name="feedName" className="w-full rounded-md border bg-background px-3 py-2" placeholder="Feed name" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Medicine quantity</label>
            <input type="number" step="0.01" min="0" name="medicineQuantity" className="w-full rounded-md border bg-background px-3 py-2" placeholder="0" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Medicine price</label>
            <input type="number" step="0.01" min="0" name="medicinePrice" className="w-full rounded-md border bg-background px-3 py-2" placeholder="0.00" />
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
