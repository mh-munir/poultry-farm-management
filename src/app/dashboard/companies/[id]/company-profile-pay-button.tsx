'use client';

import { useState } from 'react';
import { Wallet } from 'lucide-react';
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
      <Button type="button" onClick={() => setOpen(true)} className="h-[42px]">
        <Wallet className="mr-2 h-4 w-4" />
        {dict.common.payCompany}
      </Button>
      <PayCompanyModal
        open={open}
        onOpenChange={setOpen}
        preselectedCompanyId={companyId}
      />
    </>
  );
}
