'use client';

import { useState } from 'react';
import { ArrowRight, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/i18n/provider';
import { PayCompanyModal } from '../pay-company-modal';

type CompanyProfilePayButtonProps = {
  companyId: number;
};

export function CompanyProfilePayButton({ companyId }: CompanyProfilePayButtonProps) {
  const { dict } = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className="h-14 w-full min-w-[190px] justify-between rounded-xl bg-blue-600 px-4 text-sm text-white shadow-[0_10px_20px_-14px_rgba(37,99,235,0.9)] hover:bg-blue-700 sm:w-auto">
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <Wallet className="h-4 w-4" />
          </span>
          {dict.common.payCompany}
        </span>
        <ArrowRight className="h-4 w-4" />
      </Button>
      <PayCompanyModal
        open={open}
        onOpenChange={setOpen}
        preselectedCompanyId={companyId}
      />
    </>
  );
}
