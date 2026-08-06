'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { createOrUpdateParty } from '@/features/parties/actions';
import { useModalSave } from '@/hooks/use-modal-save';
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
  defaultPurchasePrice?: number | null;
  stockQuantity: number;
};

type AddPartyDialogProps = {
  partyOptions: PartyOption[];
  productOptions: ProductOption[];
};

export function AddPartyDialog({ partyOptions, productOptions }: AddPartyDialogProps) {
  const router = useRouter();
  const { isSaving, saveError, save } = useModalSave();
  const [isAddOpen, setIsAddOpen] = useState(false);
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

    const form = event.currentTarget;
    const formData = new FormData(form);

    if (compressedImageFile) {
      formData.set('image', compressedImageFile, compressedImageFile.name);
    }

    const result = await save(() => createOrUpdateParty(formData), {
      refreshOnSuccess: true,
      onClose: () => {
        setIsAddOpen(false);
        setAddFormValues({ name: '', phone: '', address: '', partyType: 'BOTH' });
        setCompressedImageFile(null);
        setImageCompressionStatus('');
      }
    });

    if (!result.success) {
      setAddError(result.message);
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
          if (!open && !isSaving) {
            setIsAddOpen(false);
            setAddError('');
          }
        }}
        title="Add Party"
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)} disabled={isSaving} className="min-w-[110px] rounded-xl px-4 py-2.5 text-sm font-semibold">
              Cancel
            </Button>
            <Button
              type="submit"
              form="add-party-form"
              disabled={isSaving}
              className={`min-w-[132px] rounded-xl px-4 py-2.5 text-sm font-semibold ${isSaving ? 'cursor-not-allowed opacity-75' : ''}`}
            >
              {isSaving ? '⏳ Saving...' : '💾 Save Party'}
            </Button>
          </div>
        }
      >
        <form
          id="add-party-form"
          onSubmit={handleAddFormSubmit}
          autoComplete="off"
          encType="multipart/form-data"
          className="space-y-3"
        >
          {(addError || saveError) && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 shadow-sm">
              <p className="text-sm font-semibold text-rose-900">⚠️ Error</p>
              <p className="mt-1 text-sm text-rose-800">{addError || saveError}</p>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="h-2.5 w-2.5 rounded-full bg-slate-900" />
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-700">Basic information</h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Party Name</label>
                <input
                  name="name"
                  autoComplete="off"
                  value={addFormValues.name}
                  onChange={(event) => handleAddChange('name', event.target.value)}
                  required
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100"
                  placeholder="Party name"
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Mobile number</label>
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
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100"
                  placeholder="01712345678"
                />
              </div>


            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Opening balance</p>
                <p className="text-xs text-slate-500">Creates an opening ledger entry when the amount is non-zero.</p>
              </div>
              <div className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-700">
                Ledger
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Party type</label>
                <select
                  name="partyType"
                  autoComplete="off"
                  value={addFormValues.partyType}
                  onChange={(event) => handleAddChange('partyType', event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm transition-all duration-200 hover:border-slate-300 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                >
                  <option value="CUSTOMER">Customer</option>
                  <option value="PARTY">Party Supplier (Eggs & Chicken)</option>
                  <option value="BOTH">Customer + Party Supplier</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Opening Balance Amount</label>
                <input type="number" step="0.01" min="0" name="openingBalanceAmount" defaultValue={0} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm transition-all duration-200 hover:border-slate-300 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100" />
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Balance Type</label>
                <select
                  name="openingBalanceType"
                  defaultValue="CUSTOMER_DUE"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm transition-all duration-200 hover:border-slate-300 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100"
                >
                  <option value="CUSTOMER_DUE">Customer Due</option>
                  <option value="CUSTOMER_ADVANCE">Customer Advance</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="h-2.5 w-2.5 rounded-full bg-slate-900" />
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-700">Additional information</h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Party Profile Image</label>
                <input
                  type="file"
                  name="image"
                  accept="image/*"
                  onChange={handleImageCompress}
                  className="block h-11 w-full cursor-pointer rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600 shadow-sm transition-all duration-200 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:border-slate-300 hover:bg-white"
                />
                {imageCompressionStatus && (
                  <p className="mt-1 text-xs text-slate-500">{imageCompressionStatus}</p>
                )}
                <p className="mt-1 text-xs text-slate-500">Upload an image to display on the party profile (will be compressed automatically)</p>
              </div>

              <input type="hidden" name="isActive" value="on" readOnly />

              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Address</label>
                <textarea
                  name="address"
                  autoComplete="off"
                  value={addFormValues.address}
                  onChange={(event) => handleAddChange('address', event.target.value)}
                  required
                  rows={3}
                  className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100"
                  placeholder="Address"
                />
              </div>
            </div>
          </div>
        </form>
      </Dialog>
    </>
  );
}