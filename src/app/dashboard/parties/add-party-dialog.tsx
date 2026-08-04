'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { createOrUpdateParty } from '@/features/parties/actions';
import { useToast } from '@/hooks/use-toast';
import { getFriendlyServerActionError, handleStaleServerActionError } from '@/lib/server-action-errors';
import { SalesEntryPopup } from '@/components/dashboard/sales-entry-popup';
import { ReceivePaymentButton } from './receive-payment-button';
import { PaySupplierButton } from './pay-supplier-button';
import { SupplierPurchaseButton } from './supplier-purchase-button';

export type PartyOption = {
  id: number;
  name: string;
};

export type ProductOption = {
  id: number;
  name: string;
  code: string;
  productType: string;
  unit: string;
  defaultSellingPrice: number;
  stockQuantity: number;
};

type AddPartyDialogProps = {
  partyOptions: PartyOption[];
  productOptions: ProductOption[];
};

export function AddPartyDialog({ partyOptions, productOptions }: AddPartyDialogProps) {
  const router = useRouter();
  const { success, error: showToastError } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAddLoading, setIsAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addFormValues, setAddFormValues] = useState({
    name: '',
    phone: '',
    address: '',
    partyType: 'BOTH'
  });
  const [compressedImageFile, setCompressedImageFile] = useState<File | null>(null);
  const [imageCompressionStatus, setImageCompressionStatus] = useState('');

  const handleAddChange = (field: string, value: string) => {
    const normalizedValue = field === 'phone'
      ? value.replace(/[^0-9]/g, '').slice(0, 11)
      : value;

    setAddFormValues((current) => ({ ...current, [field]: normalizedValue }));
  };

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
    } catch (err) {
      setImageCompressionStatus('Error compressing image');
      console.error('Image compression error:', err);
    }
  };

  const handleAddFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAddError('');
    setIsAddLoading(true);
    
    const form = event.currentTarget;
    const formData = new FormData(form);

    if (compressedImageFile) {
      formData.set('image', compressedImageFile, compressedImageFile.name);
    }

    try {
      const result = await createOrUpdateParty(formData);
      
      if (result.success) {
        success(result.message);
        router.refresh();
        setTimeout(() => {
          setIsAddOpen(false);
          setAddFormValues({ name: '', phone: '', address: '', partyType: 'BOTH' });
          setCompressedImageFile(null);
          setImageCompressionStatus('');
          setIsAddLoading(false);
        }, 500);
      } else {
        setAddError(result.message);
        showToastError(result.message);
        setIsAddLoading(false);
      }
    } catch (error) {
      const staleHandled = handleStaleServerActionError(error, showToastError);
      const message = staleHandled ? 'A new version of the application is available. Please refresh the page and try again.' : getFriendlyServerActionError(error);
      if (!staleHandled) {
        setAddError(message);
        showToastError(message);
      }
      setIsAddLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        <Button type="button" onClick={() => setIsAddOpen(true)} className="px-6 py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all">
          + Add Parties
        </Button>
        <SalesEntryPopup partyOptions={partyOptions} productOptions={productOptions} buttonClassName="px-6 py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all" />
        <SupplierPurchaseButton buttonClassName="px-6 py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all" />
        <ReceivePaymentButton buttonClassName="px-6 py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all" />
        <PaySupplierButton buttonClassName="px-6 py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all" />
      </div>

      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => {
          if (!open && !isAddLoading) {
            setIsAddOpen(false);
            setAddError('');
          }
        }}
        title="Add Party"
        footer={
          <div className="flex flex-wrap gap-3 justify-end">
            <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)} disabled={isAddLoading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              form="add-party-form"
              disabled={isAddLoading}
              className={isAddLoading ? 'opacity-75 cursor-not-allowed' : ''}
            >
              {isAddLoading ? '⏳ Saving...' : '💾 Save Party'}
            </Button>
          </div>
        }
      >
        <form
          id="add-party-form"
          onSubmit={handleAddFormSubmit}
          autoComplete="off"
          encType="multipart/form-data"
          className="grid gap-4 sm:grid-cols-2"
        >
          {addError && (
            <div className="sm:col-span-2 rounded-lg border-2 border-rose-300 bg-rose-50 p-4">
              <p className="text-base font-semibold text-rose-900">⚠️ Error</p>
              <p className="mt-1 text-sm text-rose-800">{addError}</p>
            </div>
          )}

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium">Party Name</label>
            <input
              name="name"
              autoComplete="off"
              value={addFormValues.name}
              onChange={(event) => handleAddChange('name', event.target.value)}
              required
              className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors bg-white hover:border-gray-300"
              placeholder="Party name"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium">Mobile number</label>
            <input
              type="tel"
              name="phone"
              autoComplete="off"
              value={addFormValues.phone}
              onChange={(event) => handleAddChange('phone', event.target.value)}
              required
              inputMode="numeric"
              pattern="[0-9]{11}"
              maxLength={11}
              className="w-full rounded-md border bg-background px-3 py-2"
              placeholder="01712345678"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium">Party type</label>
            <select
              name="partyType"
              autoComplete="off"
              value={addFormValues.partyType}
              onChange={(event) => handleAddChange('partyType', event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2"
            >
              <option value="CUSTOMER">Customer</option>
              <option value="PARTY">Party Supplier (Eggs & Chicken)</option>
              <option value="BOTH">Customer + Party Supplier</option>
            </select>
          </div>

          <div className="sm:col-span-2 rounded-xl border bg-background p-4">
            <div className="mb-3">
              <p className="text-sm font-semibold">Opening Balance</p>
              <p className="text-xs text-muted-foreground">Creates an opening ledger entry when the amount is non-zero.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium">Description</label>
                <textarea name="openingBalanceDescription" rows={2} className="w-full rounded-md border bg-background px-3 py-2" placeholder="Opening balance note..." />
              </div>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium">Party Profile Image</label>
            <input
              type="file"
              name="image"
              accept="image/*"
              onChange={handleImageCompress}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {imageCompressionStatus && (
              <p className="mt-1 text-xs text-muted-foreground">{imageCompressionStatus}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">Upload an image to display on the party profile (will be compressed automatically)</p>
          </div>

          <input type="hidden" name="isActive" value="on" readOnly />

          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium">Address</label>
            <textarea
              name="address"
              autoComplete="off"
              value={addFormValues.address}
              onChange={(event) => handleAddChange('address', event.target.value)}
              required
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2"
              placeholder="Address"
            />
          </div>
        </form>
      </Dialog>
    </>
  );
}