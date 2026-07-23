'use client';

import { useState } from 'react';
import Link from 'next/link';
import imageCompression from 'browser-image-compression';
import { Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { createOrUpdatePartyWithToast, deleteParty } from '@/features/parties/actions';
import { useToast } from '@/hooks/use-toast';

export type PartyRowEditPayload = {
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

type PartyRowActionsProps = {
  party: PartyRowEditPayload;
  editOnly?: boolean;
};

export function PartyRowActions({ party, editOnly = false }: PartyRowActionsProps) {
  const router = useRouter();
  const { success, error } = useToast();
  const [actionOpen, setActionOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true
      });
      setCompressedImageFile(compressedFile);
      const originalSize = (file.size / 1024 / 1024).toFixed(2);
      const compressedSize = (compressedFile.size / 1024 / 1024).toFixed(2);
      setImageCompressionStatus(`Compressed: ${originalSize}MB -> ${compressedSize}MB`);
    } catch {
      setImageCompressionStatus('Error compressing image');
    }
  };

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    if (compressedImageFile) {
      formData.set('image', compressedImageFile, compressedImageFile.name);
    }

    const result = await createOrUpdatePartyWithToast(formData);
    setIsSaving(false);

    if (result.success) {
      success(result.message);
      setEditOpen(false);
      setActionOpen(false);
      router.refresh();
      return;
    }

    error(result.message);
  };

  const handleDeleteSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const confirmed = window.confirm(`Delete ${party.name}? This will remove related transactions and payments.`);

    if (!confirmed) {
      event.preventDefault();
    }
  };

  return (
    <div className="inline-flex justify-end">
      {editOnly ? (
        <Button type="button" onClick={() => setEditOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit Party
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setActionOpen(true)}
          aria-label={`Actions for ${party.name}`}
          className="h-9 w-9 p-0"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      )}

      {!editOnly ? (
        <Dialog open={actionOpen} onOpenChange={setActionOpen} title="Party Actions">
          <div className="grid gap-3">
            <Link
              href={`/dashboard/parties/${party.id}`}
              className="flex w-full items-center gap-2 rounded-md border px-4 py-3 text-left text-sm font-medium hover:bg-muted"
              onClick={() => setActionOpen(false)}
            >
              <Eye className="h-4 w-4" />
              Profile
            </Link>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md border px-4 py-3 text-left text-sm font-medium hover:bg-muted"
              onClick={() => {
                setEditOpen(true);
                setActionOpen(false);
              }}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
            <form action={deleteParty} onSubmit={handleDeleteSubmit}>
              <input type="hidden" name="partyId" value={party.id} />
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-md border border-red-200 px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </form>
          </div>
        </Dialog>
      ) : null}

      <Dialog open={editOpen} onOpenChange={setEditOpen} title="Edit Party">
        <form onSubmit={handleEditSubmit} encType="multipart/form-data" autoComplete="off" className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="id" value={party.id} />
          <input type="hidden" name="existingImageUrl" value={party.imageUrl ?? ''} />
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
            <input type="number" step="0.01" min="0" name="creditLimit" defaultValue={party.creditLimit ?? '0'} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Opening balance</label>
            <input type="number" step="0.01" name="openingBalance" defaultValue={party.openingBalance} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Party image</label>
            <input type="file" name="image" accept="image/*" onChange={handleImageCompress} className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
            {imageCompressionStatus ? <p className="mt-1 text-xs text-muted-foreground">{imageCompressionStatus}</p> : null}
            {party.imageUrl ? (
              <div className="mt-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={party.imageUrl} alt={party.name} className="h-20 w-20 rounded-lg border object-cover" />
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-3">
            <input id={`isActive-${party.id}`} name="isActive" type="checkbox" defaultChecked={party.isActive} className="h-4 w-4" />
            <label htmlFor={`isActive-${party.id}`} className="text-sm">Active party</label>
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">Address</label>
            <textarea name="address" rows={3} defaultValue={party.address ?? ''} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-3">
            <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
