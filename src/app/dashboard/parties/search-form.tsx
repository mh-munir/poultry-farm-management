'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

interface SearchFormProps {
  search: string;
  partyType: string;
  status: string;
}

export function PartySearchForm({ search, partyType, status }: SearchFormProps) {
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
        params.set('search', value.trim());
      }

      if (partyType && partyType !== 'ALL') {
        params.set('partyType', partyType);
      }

      if (status && status !== 'ALL') {
        params.set('status', status);
      }

      params.set('page', '1');
      router.replace(`/dashboard/parties?${params.toString()}`, { scroll: false });
    }, 250);
  };

  return (
    <div className="relative w-full max-w-lg md:w-96">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        name="search"
        value={searchValue}
        onChange={(event) => handleChange(event.target.value)}
        placeholder="Search party name..."
        autoComplete="off"
        className="w-full rounded-md border bg-background px-10 py-2 text-sm"
      />
    </div>
  );
}
