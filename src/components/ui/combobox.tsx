'use client';

import { useState, useRef, useEffect } from 'react';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface SearchableComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  name?: string;
  required?: boolean;
}

export function SearchableCombobox({
  options,
  value,
  onValueChange,
  placeholder = 'Search...',
  emptyText = 'No results found',
  name,
  required
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((option) => option.value === value);
  const displayValue = selectedOption?.label ?? '';

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!open) {
      setSearch('');
      setHighlightedIndex(-1);
    }
  }, [open]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearch('');
        setHighlightedIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value;
    setSearch(nextValue);
    setOpen(true);
    setHighlightedIndex(0);
    onValueChange(nextValue);
  }

  function handleInputFocus() {
    setOpen(true);
    setSearch('');
    setHighlightedIndex(0);
  }

  function handleInputBlur() {
    // Delay to allow click events on options to fire first
    setTimeout(() => {
      if (open) {
        const exactMatch = filteredOptions.find(
          (option) => option.label.toLowerCase() === search.toLowerCase()
        );
        if (exactMatch) {
          onValueChange(exactMatch.value);
        } else if (search.trim() !== '') {
          onValueChange('');
        }
        setOpen(false);
        setSearch('');
        setHighlightedIndex(-1);
      }
    }, 150);
  }

  function handleOptionClick(option: ComboboxOption) {
    onValueChange(option.value);
    setOpen(false);
    setSearch('');
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'Enter') {
        setOpen(true);
        setSearch('');
        setHighlightedIndex(0);
        event.preventDefault();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev < filteredOptions.length - 1 ? prev + 1 : 0;
          return next;
        });
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev > 0 ? prev - 1 : filteredOptions.length - 1;
          return next;
        });
        break;
      case 'Enter':
        event.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          const selected = filteredOptions[highlightedIndex];
          onValueChange(selected.value);
          setOpen(false);
          setSearch('');
          setHighlightedIndex(-1);
          inputRef.current?.blur();
        }
        break;
      case 'Escape':
        setOpen(false);
        setSearch('');
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        name={name}
        value={open ? search : displayValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleInputKeyDown}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
      />
      {open && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-white py-1 text-sm shadow-md"
        >
          {filteredOptions.length === 0 ? (
            <li className="px-3 py-2 text-muted-foreground">{emptyText}</li>
          ) : (
            filteredOptions.map((option, index) => (
              <li
                key={option.value}
                onMouseDown={(event) => {
                  event.preventDefault();
                  handleOptionClick(option);
                }}
                className={`cursor-pointer px-3 py-2 ${
                  index === highlightedIndex
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {option.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
