'use client';

import { useState } from 'react';
import Link from 'next/link';
import imageCompression from 'browser-image-compression';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreHorizontal, Pencil, Trash2, Printer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { createOrUpdateParty, deleteParty } from '@/features/parties/actions';
import { useToast } from '@/hooks/use-toast';
import { getFriendlyServerActionError, handleStaleServerActionError } from '@/lib/server-action-errors';

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
  openingBalanceType?: string | null;
  openingBalanceDescription?: string | null;
  imageUrl: string | null;
  isActive: boolean;
};

type PartyRowActionsProps = {
  party: PartyRowEditPayload;
  editOnly?: boolean;
  printHref?: string;
  editButtonClassName?: string;
  printButtonClassName?: string;
};

export function PartyRowActions({ party, editOnly = false, printHref, editButtonClassName, printButtonClassName }: PartyRowActionsProps) {
  const router = useRouter();
  const { success, error: showToastError } = useToast();
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

    try {
      const result = await createOrUpdateParty(formData);
      setIsSaving(false);

      if (result.success) {
        success(result.message);
        setEditOpen(false);
        setActionOpen(false);
        router.refresh();
        return;
      }

      showToastError(result.message);
    } catch (error) {
      setIsSaving(false);
      const staleHandled = handleStaleServerActionError(error, showToastError);
      if (!staleHandled) {
        const message = getFriendlyServerActionError(error);
        showToastError(message);
      }
    }
  };

  const handleDeleteSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const confirmed = window.confirm(`Delete ${party.name}? This will remove related transactions and payments.`);

    if (!confirmed) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    try {
      const result = await deleteParty(formData);

      if (result.success) {
        success(result.message);
        setActionOpen(false);
        router.refresh();
      } else {
        showToastError(result.message);
      }
    } catch (error) {
      const staleHandled = handleStaleServerActionError(error, showToastError);
      if (!staleHandled) {
        const message = getFriendlyServerActionError(error);
        showToastError(message);
      }
    }
  };

  return (
    <div className="relative z-[70] inline-flex justify-end">
      {editOnly ? (
        <div className="inline-flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" onClick={() => setEditOpen(true)} className={editButtonClassName}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Party
          </Button>
          {printHref ? (
            <Button asChild size="sm" className={printButtonClassName}>
              <a href={printHref} target="_blank" rel="noreferrer">
                <Printer className="mr-2 h-4 w-4" />
                Print
              </a>
            </Button>
          ) : null}
        </div>
      ) : (
        <DropdownMenu.Root open={actionOpen} onOpenChange={setActionOpen}>
          <DropdownMenu.Trigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Actions for ${party.name}`}
              className="h-9 w-9 p-0"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              side="bottom"
              align="end"
              sideOffset={8}
              collisionPadding={12}
              className="z-[100] w-[180px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
            >
              <DropdownMenu.Item
                className="flex w-full items-center gap-2 rounded-none px-4 py-3 text-left text-sm font-medium text-slate-900 outline-none data-[highlighted]:bg-slate-100"
                onSelect={() => {
                  setEditOpen(true);
                  setActionOpen(false);
                }}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="mx-2 h-px bg-slate-200" />
              <form onSubmit={handleDeleteSubmit}>
                <input type="hidden" name="partyId" value={party.id} />
                <DropdownMenu.Item asChild>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 rounded-none px-4 py-3 text-left text-sm font-medium text-red-600 outline-none data-[highlighted]:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </DropdownMenu.Item>
              </form>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}

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
              <option value="PARTY">Party Supplier (Eggs & Chicken)</option>
              <option value="BOTH">Customer + Party Supplier</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Tax number</label>
            <input name="taxNumber" defaultValue={party.taxNumber ?? ''} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Credit limit</label>
            <input type="number" step="0.01" min="0" name="creditLimit" defaultValue={party.creditLimit ?? ''} className="w-full rounded-md border bg-background px-3 py-2" />
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
                <input type="number" step="0.01" min="0" name="openingBalanceAmount" defaultValue={Number(party.openingBalance ?? 0) === 0 ? 0 : Math.abs(Number(party.openingBalance ?? 0))} className="w-full rounded-md border bg-background px-3 py-2" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Balance Type</label>
                <div className="flex flex-col gap-2 rounded-md border bg-background px-3 py-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="openingBalanceType" value="CUSTOMER_DUE" defaultChecked={party.openingBalanceType !== 'CUSTOMER_ADVANCE'} className="h-4 w-4" />
                    Customer Due
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="openingBalanceType" value="CUSTOMER_ADVANCE" defaultChecked={party.openingBalanceType === 'CUSTOMER_ADVANCE'} className="h-4 w-4" />
                    Customer Advance
                  </label>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">Description</label>
                <textarea name="openingBalanceDescription" rows={2} defaultValue={party.openingBalanceDescription ?? ''} className="w-full rounded-md border bg-background px-3 py-2" placeholder="Opening balance note..." />
              </div>
            </div>
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
