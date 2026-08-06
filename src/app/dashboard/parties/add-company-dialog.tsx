'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { createCompany } from '@/features/companies/actions';
import { useModalSave } from '@/hooks/use-modal-save';

export function AddCompanyDialog() {
  const { isSaving, saveError, save } = useModalSave();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addError, setAddError] = useState('');

  const handleAddSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAddError('');

    const formData = new FormData(event.currentTarget);

    const result = await save(() => createCompany(formData), {
      refreshOnSuccess: true,
      onClose: () => setIsAddOpen(false)
    });

    if (!result.success) {
      setAddError(result.message);
    }
  };

  return (
    <>
      <Button onClick={() => setIsAddOpen(true)} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
        Add Company
      </Button>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen} title="Add Company">
        <form onSubmit={handleAddSubmit} autoComplete="off" className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">Company name</label>
            <input name="name" required className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Contact person</label>
            <input name="contactPerson" className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Phone</label>
            <input
              name="phone"
              inputMode="numeric"
              pattern="[0-9]{11}"
              maxLength={11}
              placeholder="Optional: 01712345678"
              className="w-full rounded-md border bg-background px-3 py-2"
            />
            <p className="mt-1 text-xs text-muted-foreground">Mobile number is optional for companies.</p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Email</label>
            <input type="email" name="email" className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Company type</label>
            <select name="companyType" defaultValue="FEED" className="w-full rounded-md border bg-background px-3 py-2">
              <option value="FEED">Feed Company</option>
              <option value="MEDICINE">Medicine Company</option>
              <option value="BOTH">Both</option>
            </select>
          </div>
          <div className="md:col-span-2 rounded-lg border bg-muted/20 p-4">
            <p className="mb-3 text-sm font-semibold">Opening Balance</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Opening Balance Amount</label>
                <input type="number" step="0.01" name="openingBalanceAmount" defaultValue={0} className="w-full rounded-md border bg-background px-3 py-2" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Description</label>
                <input name="openingBalanceDescription" placeholder="Optional" className="w-full rounded-md border bg-background px-3 py-2" />
              </div>
            </div>
          </div>
          <div className="md:col-span-2 flex items-center gap-2 rounded-md border bg-background px-3 py-3">
            <input id="company-isActive" name="isActive" type="checkbox" defaultChecked={true} className="h-4 w-4" />
            <label htmlFor="company-isActive" className="text-sm">Active company</label>
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-3">
            <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Company'}</Button>
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSaving}>Cancel</Button>
          </div>
          {saveError ? (
            <div className="md:col-span-2 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 shadow-sm">
              <p className="text-sm font-semibold text-rose-900">⚠️ Error</p>
              <p className="mt-1 text-sm text-rose-800">{saveError}</p>
            </div>
          ) : null}
        </form>
      </Dialog>
    </>
  );
}
