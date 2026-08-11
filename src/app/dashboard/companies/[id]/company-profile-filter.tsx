'use client';

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
      <option value="ALL">All Purchases</option>
      <option value="EGG">Eggs</option>
      <option value="CHICKEN">Chicken</option>
      <option value="CHICK">Hatchling / Chick</option>
    </select>
  );
}
