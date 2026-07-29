'use client';

import { useState } from 'react';
import { PayCompanyModal } from '../pay-company-modal';

type CompanyProfilePayButtonProps = {
  companyId: number;
};

export function CompanyProfilePayButton({ companyId }: CompanyProfilePayButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <PayCompanyModal
      open={open}
      onOpenChange={setOpen}
      preselectedCompanyId={companyId}
    />
  );
}
