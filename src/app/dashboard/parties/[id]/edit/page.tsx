import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { createOrUpdateParty } from '@/features/parties/actions';
import { prisma } from '@/server/db';

export default async function EditPartyPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const party = await prisma.party.findUnique({
    where: { id: Number(id) },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      address: true,
      partyType: true,
      taxNumber: true,
      creditLimit: true,
      openingBalance: true,
      isActive: true
    }
  });

  if (!party) notFound();

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Edit Party</p>
          <h1 className="mt-2 text-3xl font-semibold">Update party details</h1>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/parties">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to list
          </Link>
        </Button>
      </div>

      <form action={createOrUpdateParty} className="rounded-2xl border bg-card p-6 shadow-sm">
        <input type="hidden" name="id" value={party.id} />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">Party name</label>
            <input name="name" required defaultValue={party.name} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Phone</label>
            <input name="phone" defaultValue={party.phone ?? ''} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Email</label>
            <input type="email" name="email" defaultValue={party.email ?? ''} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Party type</label>
            <select name="partyType" defaultValue={party.partyType} className="w-full rounded-md border bg-background px-3 py-2">
              <option value="CUSTOMER">Customer</option>
              <option value="SUPPLIER">Supplier</option>
              <option value="BOTH">Both</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Tax number</label>
            <input name="taxNumber" defaultValue={party.taxNumber ?? ''} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Credit limit</label>
            <input type="number" step="0.01" min="0" name="creditLimit" defaultValue={party.creditLimit?.toString() ?? '0'} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Opening balance</label>
            <input type="number" step="0.01" name="openingBalance" defaultValue={party.openingBalance.toString()} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-3">
            <input id="isActive" name="isActive" type="checkbox" defaultChecked={party.isActive} className="h-4 w-4" />
            <label htmlFor="isActive" className="text-sm">Active party</label>
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">Address</label>
            <textarea name="address" rows={3} defaultValue={party.address ?? ''} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="submit">Save Changes</Button>
          <Button asChild variant="outline" type="button">
            <Link href="/dashboard/parties">Cancel</Link>
          </Button>
        </div>
      </form>
    </main>
  );
}
