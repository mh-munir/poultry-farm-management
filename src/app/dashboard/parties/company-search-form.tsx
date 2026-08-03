'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

interface CompanySearchFormProps {
  search: string;
  companyType: string;
  status: string;
}

export function CompanySearchForm({ search, companyType, status }: CompanySearchFormProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(search);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSearchValue(search);
  }, [search]);

  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  const handleChange = (value: string) => {
    setSearchValue(value);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      const params = new URLSearchParams();

      if (value.trim() !== '') {
        params.set('companySearch', value.trim());
      }

      if (companyType && companyType !== 'ALL') {
        params.set('companyType', companyType);
      }

      if (status && status !== 'ALL') {
        params.set('companyStatus', status);
      }

      params.set('companyPage', '1');
      router.replace(`/dashboard/companies?${params.toString()}`, { scroll: false });
    }, 250);
  };

  return (
    <div className="relative w-full max-w-lg md:w-96">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        name="companySearch"
        value={searchValue}
        onChange={(event) => handleChange(event.target.value)}
        placeholder="Search company name..."
        autoComplete="off"
        className="w-full rounded-md border bg-background px-10 py-2 text-sm"
      />
    </div>
  );
}
