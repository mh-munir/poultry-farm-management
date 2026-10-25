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
  const inputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
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
    <div className="relative w-full xl:ml-auto xl:max-w-[360px]">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        name="search"
        value={searchValue}
        onChange={(event) => handleChange(event.target.value)}
        placeholder={"Search party name..."}
        aria-label="Search party name"
        title="Search parties (Ctrl+K)"
        autoComplete="off"
        className="h-[52px] w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-24 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
        Ctrl + K
      </kbd>
    </div>
  );
}
