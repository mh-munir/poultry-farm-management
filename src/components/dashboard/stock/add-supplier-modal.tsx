'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { createSupplierForStock } from '@/features/stock/actions';
import { useToast } from '@/hooks/use-toast';

type AddSupplierModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (party: { id: number; name: string }) => void;
};

export function AddSupplierModal({ open, onOpenChange, onSuccess }: AddSupplierModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [farmName, setFarmName] = useState('');
  const [partyType, setPartyType] = useState<'PARTY' | 'COMPANY' | 'BOTH'>('PARTY');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { success: showSuccess } = useToast();

  function reset() {
    setName('');
    setPhone('');
    setFarmName('');
    setPartyType('PARTY');
    setError('');
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData();
    formData.set('name', name);
    formData.set('phone', phone);
    formData.set('partyType', partyType);
    formData.set('farmName', farmName);

    const result = await createSupplierForStock(formData);

    if (result.success && result.party) {
      showSuccess(result.message);
      onSuccess?.(result.party);
      reset();
      onOpenChange(false);
    } else {
      setError(result.message);
    }

    setLoading(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          reset();
        }
        onOpenChange(next);
      }}
      title="Add Party Supplier"
      footer={
        <div className="flex flex-wrap gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="add-supplier-form" disabled={loading} className={loading ? 'opacity-75 cursor-not-allowed' : ''}>
            {loading ? 'Saving...' : 'Save Party Supplier'}
          </Button>
        </div>
      }
    >
      <form id="add-supplier-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        {error && (
          <div className="sm:col-span-2 rounded-lg border-2 border-rose-300 bg-rose-50 p-4">
            <p className="text-base font-semibold text-rose-900">Error</p>
            <p className="mt-1 text-sm text-rose-800">{error}</p>
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-medium">Party / Company Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2"
            placeholder="Acme Poultry Ltd"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2"
            placeholder="01712345678"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Party Type</label>
          <select value={partyType} onChange={(e) => setPartyType(e.target.value as 'PARTY' | 'COMPANY' | 'BOTH')} className="w-full rounded-md border bg-background px-3 py-2">
            <option value="PARTY">Party Supplier (Eggs & Chicken)</option>
            <option value="COMPANY">Company Supplier (Feed & Medicine)</option>
            <option value="BOTH">Both</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-medium">Farm / Company Name (optional)</label>
          <input
            value={farmName}
            onChange={(e) => setFarmName(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2"
            placeholder="Used in party selector"
          />
        </div>
      </form>
    </Dialog>
  );
}
