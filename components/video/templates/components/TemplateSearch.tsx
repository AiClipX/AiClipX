import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { 
  MagnifyingGlassIcon, 
  XMarkIcon 
} from '@heroicons/react/24/outline';

interface TemplateSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
}

export type { TemplateSearchProps };

const DEBOUNCE_DELAY = 300; // 300ms debounce delay

export function TemplateSearch({ 
  onSearch, 
  placeholder, 
  disabled = false,
  loading = false
}: TemplateSearchProps) {
  const { t } = useLanguage();
  const [searchValue, setSearchValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use provided placeholder or default localized one
  const searchPlaceholder = placeholder || t('templates.search.placeholder');

  // Debounced search function
  const debouncedSearch = useCallback((query: string) => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set searching state immediately for UI feedback
    setIsSearching(true);

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      onSearch(query);
      setIsSearching(false);
    }, DEBOUNCE_DELAY);
  }, [onSearch]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    debouncedSearch(value);
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchValue('');
    setIsSearching(false);
    
    // Clear debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Immediately trigger search with empty query
    onSearch('');
    
    // Focus input after clearing
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleClearSearch();
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Show loading state when either prop loading is true or internal searching state
  const showLoading = loading || isSearching;

  return (
    <div className="relative">
      <div className="relative">
        {/* Search icon */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon 
            className={`h-5 w-5 transition-colors duration-200 ${
              disabled 
                ? 'text-neutral-600' 
                : showLoading 
                  ? 'text-blue-400 animate-pulse' 
                  : 'text-neutral-400'
            }`} 
          />
        </div>

        {/* Search input */}
        <input
          ref={inputRef}
          type="text"
          value={searchValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={searchPlaceholder}
          disabled={disabled}
          className={`
            block w-full pl-10 pr-10 py-3 
            bg-neutral-900 border border-neutral-700 rounded-lg
            text-white placeholder-neutral-400
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            hover:border-neutral-600
            ${disabled 
              ? 'opacity-50 cursor-not-allowed bg-neutral-800' 
              : 'hover:bg-neutral-800'
            }
            ${showLoading ? 'pr-16' : ''}
          `}
          aria-label={t('templates.search.placeholder')}
        />

        {/* Clear button and loading indicator */}
        <div className="absolute inset-y-0 right-0 flex items-center">
          {/* Loading indicator */}
          {showLoading && (
            <div className="pr-3">
              <div className="flex items-center text-neutral-400 text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-neutral-600 border-t-blue-400 mr-2" />
                <span className="hidden sm:inline">{t('templates.search.searching')}</span>
              </div>
            </div>
          )}

          {/* Clear button */}
          {searchValue && !disabled && (
            <button
              onClick={handleClearSearch}
              className={`
                p-2 mr-1 rounded-md
                text-neutral-400 hover:text-white hover:bg-neutral-700
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500
                ${showLoading ? 'mr-20' : ''}
              `}
              aria-label={t('templates.search.clear')}
              title={t('templates.search.clear')}
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Screen reader status */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {showLoading && t('templates.search.searching')}
        {searchValue && !showLoading && `Search results for: ${searchValue}`}
      </div>
    </div>
  );
}

export default TemplateSearch;