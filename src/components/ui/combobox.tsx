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
  onOptionSelect?: (option: ComboboxOption) => void;
  placeholder?: string;
  emptyText?: string;
  createNewLabel?: string;
  name?: string;
  required?: boolean;
}

export function SearchableCombobox({
  options,
  value,
  onValueChange,
  onOptionSelect,
  placeholder = 'Search...',
  emptyText = 'No results found',
  createNewLabel,
  name,
  required
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedValue = value == null ? '' : String(value);
  const cleanValue = normalizedValue === 'NaN' || normalizedValue === 'undefined' ? '' : normalizedValue;
  const selectedOption = options.find((option) => option.value === cleanValue);
  const displayValue = open ? search : (selectedOption ? selectedOption.label : cleanValue ?? '');

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  );

  const exactMatch = options.find(
    (option) => option.label.toLowerCase() === search.toLowerCase()
  );

  const showCreateNew = createNewLabel
    ? search.trim().length > 0 && !exactMatch
    : false;

  const allOptions = showCreateNew
    ? [...filteredOptions, { value: search.trim(), label: `${createNewLabel}${search.trim()}` }]
    : filteredOptions;

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
    setSearch(selectedOption ? selectedOption.label : (value ?? ''));
    setHighlightedIndex(0);
  }

  function handleInputBlur() {
    // Delay to allow click events on options to fire first
    setTimeout(() => {
      if (open) {
        const exactMatch = allOptions.find(
          (option) => option.label.toLowerCase() === search.toLowerCase()
        );
        if (exactMatch) {
          onValueChange(exactMatch.value);
        } else if (search.trim() !== '') {
          onValueChange(search);
        }
        setOpen(false);
        setSearch('');
        setHighlightedIndex(-1);
      }
    }, 150);
  }

  function handleOptionClick(option: ComboboxOption) {
    onValueChange(option.value);
    if (typeof onOptionSelect === 'function') {
      onOptionSelect(option);
    }
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
          const next = prev < allOptions.length - 1 ? prev + 1 : 0;
          return next;
        });
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev > 0 ? prev - 1 : allOptions.length - 1;
          return next;
        });
        break;
      case 'Enter':
        if (highlightedIndex >= 0 && highlightedIndex < allOptions.length) {
          event.preventDefault();
          const selected = allOptions[highlightedIndex];
          onValueChange(selected.value);
          if (typeof onOptionSelect === 'function') {
            onOptionSelect(selected);
          }
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
          {allOptions.length === 0 ? (
            <li className="px-3 py-2 text-muted-foreground">{emptyText}</li>
          ) : (
            allOptions.map((option, index) => (
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
