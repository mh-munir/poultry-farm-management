'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { createCompany } from '@/features/companies/actions';
import { useToast } from '@/hooks/use-toast';

export function AddCompanyDialog() {
  const router = useRouter();
  const { success, error: showToastError } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAddLoading, setIsAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  const handleAddSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsAddLoading(true);
    setAddError('');

    const formData = new FormData(event.currentTarget);

    try {
      const result = await createCompany(formData);
      setIsAddLoading(false);

      if (result.success) {
        success(result.message);
        setIsAddOpen(false);
        router.refresh();
      } else {
        showToastError(result.message);
      }
    } catch (error) {
      setIsAddLoading(false);
      showToastError('Failed to create company.');
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
              required
              inputMode="numeric"
              pattern="[0-9]{11}"
              maxLength={11}
              placeholder="01712345678"
              className="w-full rounded-md border bg-background px-3 py-2"
            />
            <p className="mt-1 text-xs text-muted-foreground">Enter exactly 11 numeric digits.</p>
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
          <div className="md:col-span-2 flex items-center gap-2 rounded-md border bg-background px-3 py-3">
            <input id="company-isActive" name="isActive" type="checkbox" defaultChecked={true} className="h-4 w-4" />
            <label htmlFor="company-isActive" className="text-sm">Active company</label>
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-3">
            <Button type="submit" disabled={isAddLoading}>{isAddLoading ? 'Saving...' : 'Save Company'}</Button>
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
