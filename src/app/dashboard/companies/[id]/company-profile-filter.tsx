'use client';

import { useLocale } from '@/i18n/provider';

type CompanyProfileFilterProps = {
  purchaseTypeFilter: string;
  companyId: number;
  success?: string;
  error?: string;
  historyPage: number;
};

export function CompanyProfileFilter({
  purchaseTypeFilter,
  companyId,
  success,
  error,
  historyPage
}: CompanyProfileFilterProps) {
  const { dict } = useLocale();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    const params = new URLSearchParams({
      ...(success ? { success } : {}),
      ...(error ? { error } : {}),
      ...(value && value !== 'ALL' ? { purchaseTypeFilter: value } : {})
    });
    if (historyPage > 1) {
      params.set('historyPage', '1');
    }
    const query = params.toString();
    window.location.href = `/dashboard/companies/${companyId}${query ? `?${query}` : ''}`;
  };

  return (
    <select
      value={purchaseTypeFilter}
      onChange={handleChange}
      className="form-select"
    >
      <option value="ALL">{dict.tableHeaders.allPurchases}</option>
      <option value="EGG">{dict.productTypes.egg}</option>
      <option value="CHICKEN">{dict.productTypes.chicken}</option>
      <option value="CHICK">{dict.productTypes.chick}</option>
    </select>
  );
}
