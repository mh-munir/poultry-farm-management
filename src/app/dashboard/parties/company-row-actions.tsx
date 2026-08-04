'use client';

import { useState } from 'react';
import Link from 'next/link';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Eye, MoreHorizontal, Pencil, Printer, Trash2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { createOrUpdateCompany, deleteCompany } from '@/features/companies/actions';
import { useToast } from '@/hooks/use-toast';
import { getFriendlyServerActionError, handleStaleServerActionError } from '@/lib/server-action-errors';

export type CompanyRowEditPayload = {
  id: number;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  companyType: string;
  isActive: boolean;
  openingBalance?: number | string | null;
  openingBalanceDescription?: string | null;
};

type CompanyRowActionsProps = {
  company: CompanyRowEditPayload;
  editOnly?: boolean;
  printHref?: string;
  editButtonLabel?: string;
  editButtonClassName?: string;
  printButtonClassName?: string;
};

export function CompanyRowActions({ company, editOnly = false, printHref, editButtonLabel = 'Edit Company', editButtonClassName, printButtonClassName }: CompanyRowActionsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { success, error: showToastError } = useToast();
  const [actionOpen, setActionOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await createOrUpdateCompany(formData);
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
    const confirmed = window.confirm(`Delete ${company.name}? This will remove related transactions and payments.`);

    if (!confirmed) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    try {
      const result = await deleteCompany(Number(formData.get('companyId')));

      if (result.success) {
        success(result.message);
        setActionOpen(false);
        if (pathname?.startsWith('/dashboard/companies/') && pathname !== '/dashboard/companies') {
          router.push('/dashboard/companies');
        } else {
          router.refresh();
        }
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
            {editButtonLabel}
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
              variant="outline"
              size="sm"
              aria-label={`Actions for ${company.name}`}
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
                <input type="hidden" name="companyId" value={company.id} />
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

      <Dialog open={editOpen} onOpenChange={setEditOpen} title="Edit Company">
        <form onSubmit={handleEditSubmit} autoComplete="off" className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="id" value={company.id} />
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">Company name</label>
            <input name="name" required defaultValue={company.name} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Contact person</label>
            <input name="contactPerson" defaultValue={company.contactPerson ?? ''} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Phone</label>
            <input
              name="phone"
              inputMode="numeric"
              pattern="[0-9]{11}"
              maxLength={11}
              defaultValue={company.phone ?? ''}
              placeholder="Optional"
              className="w-full rounded-md border bg-background px-3 py-2"
            />
            <p className="mt-1 text-xs text-muted-foreground">Mobile number is optional for companies.</p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Email</label>
            <input type="email" name="email" defaultValue={company.email ?? ''} className="w-full rounded-md border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Company type</label>
            <select name="companyType" defaultValue={company.companyType} className="w-full rounded-md border bg-background px-3 py-2">
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
                <input type="number" step="0.01" name="openingBalanceAmount" defaultValue={Number(company.openingBalance ?? 0)} className="w-full rounded-md border bg-background px-3 py-2" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Description</label>
                <input name="openingBalanceDescription" defaultValue={company.openingBalanceDescription ?? ''} placeholder="Optional" className="w-full rounded-md border bg-background px-3 py-2" />
              </div>
            </div>
          </div>
          <div className="md:col-span-2 flex items-center gap-2 rounded-md border bg-background px-3 py-3">
            <input id={`isActive-${company.id}`} name="isActive" type="checkbox" defaultChecked={company.isActive} className="h-4 w-4" />
            <label htmlFor={`isActive-${company.id}`} className="text-sm">Active company</label>
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
