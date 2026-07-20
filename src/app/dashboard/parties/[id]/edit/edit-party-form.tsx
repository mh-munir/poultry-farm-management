'use client';

import { useState } from 'react';
import Link from 'next/link';
import imageCompression from 'browser-image-compression';
import { Button } from '@/components/ui/button';
import { createOrUpdateParty } from '@/features/parties/actions';
import type { Prisma } from '@prisma/client';

type PartyEditPayload = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  partyType: string;
  taxNumber: string | null;
  creditLimit: Prisma.Decimal | null;
  openingBalance: Prisma.Decimal;
  imageUrl: string | null;
  isActive: boolean;
};

type EditPartyFormProps = {
  party: PartyEditPayload;
};

export function EditPartyForm({ party }: EditPartyFormProps) {
  const [compressedImageFile, setCompressedImageFile] = useState<File | null>(null);
  const [imageCompressionStatus, setImageCompressionStatus] = useState('');

  const handleImageCompress = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setCompressedImageFile(null);
      setImageCompressionStatus('');
      return;
    }

    try {
      setImageCompressionStatus('Compressing image...');
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(file, options);
      setCompressedImageFile(compressedFile);
      const originalSize = (file.size / 1024 / 1024).toFixed(2);
      const compressedSize = (compressedFile.size / 1024 / 1024).toFixed(2);
      setImageCompressionStatus(`Compressed: ${originalSize}MB → ${compressedSize}MB`);
    } catch {
      setImageCompressionStatus('Error compressing image');
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    if (compressedImageFile) {
      formData.set('image', compressedImageFile, compressedImageFile.name);
    }

    await createOrUpdateParty(formData);
  };

  return (
    <form onSubmit={handleSubmit} encType="multipart/form-data" autoComplete="off" className="rounded-2xl border bg-card p-6 shadow-sm">
      <input type="hidden" name="id" value={party.id} />
      <input type="hidden" name="existingImageUrl" value={party.imageUrl ?? ''} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium">Party name</label>
          <input name="name" required defaultValue={party.name} className="w-full rounded-md border bg-background px-3 py-2" />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Phone</label>
          <input
            name="phone"
            required
            inputMode="numeric"
            pattern="[0-9]{11}"
            maxLength={11}
            defaultValue={party.phone ?? ''}
            className="w-full rounded-md border bg-background px-3 py-2"
          />
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
        <div>
          <label className="mb-2 block text-sm font-medium">Party image</label>
          <input type="file" name="image" accept="image/*" onChange={handleImageCompress} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
          {imageCompressionStatus && <p className="mt-1 text-xs text-muted-foreground">{imageCompressionStatus}</p>}
          {party.imageUrl ? (
            <div className="mt-2">
              <img src={party.imageUrl} alt={party.name} className="h-20 w-20 rounded-lg border object-cover" />
            </div>
          ) : null}
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
  );
}
