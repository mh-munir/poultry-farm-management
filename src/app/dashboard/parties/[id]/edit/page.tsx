import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { EditPartyForm } from './edit-party-form';
import { prisma } from '@/server/db';

type PartyEditPayload = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  partyType: string;
  taxNumber: string | null;
  creditLimit: string | null;
  openingBalance: string;
  imageUrl: string | null;
  isActive: boolean;
};

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
      imageUrl: true,
      isActive: true
    }
  });

  if (!party) notFound();

  const serializedParty: PartyEditPayload = {
    id: party.id,
    name: party.name,
    phone: party.phone,
    email: party.email,
    address: party.address,
    partyType: party.partyType,
    taxNumber: party.taxNumber,
    creditLimit: party.creditLimit?.toString() ?? null,
    openingBalance: party.openingBalance.toString(),
    imageUrl: party.imageUrl,
    isActive: party.isActive
  };

  return (
    <main className="mx-auto min-h-[80vh] max-w-screen-3xl px-2 py-4">
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

      <EditPartyForm party={serializedParty} />
    </main>
  );
}
