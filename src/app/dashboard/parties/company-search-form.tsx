'use client';

import { Search } from 'lucide-react';

interface CompanySearchFormProps {
  search: string;
  companyType: string;
  status: string;
}

export function CompanySearchForm({ search, companyType, status }: CompanySearchFormProps) {
  return (
    <form method="get" action="/dashboard/companies" className="flex items-center gap-2 w-full max-w-lg md:w-96">
      <input
        type="hidden"
        name="companyType"
        value={companyType ?? 'ALL'}
      />
      <input
        type="hidden"
        name="companyStatus"
        value={status ?? 'ALL'}
      />
      <div className="relative flex items-center w-full">
        <input
          name="companySearch"
          placeholder="Search company name..."
          className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 pl-12 text-base focus:border-blue-500 focus:outline-none transition-colors shadow-sm hover:shadow-md"
          aria-label="Search company"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.form?.submit();
            }
          }}
        />
        <button
          type="submit"
          className="absolute left-3.5 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
          aria-label="Search"
        >
          <Search size={22} />
        </button>
      </div>
    </form>
  );
}
