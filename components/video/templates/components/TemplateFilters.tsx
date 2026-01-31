import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { 
  FunnelIcon, 
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TagIcon
} from '@heroicons/react/24/outline';

interface TemplateFiltersProps {
  availableTags: string[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  disabled?: boolean;
  loading?: boolean;
}

export type { TemplateFiltersProps };

export function TemplateFilters({ 
  availableTags, 
  selectedTags, 
  onTagsChange, 
  disabled = false,
  loading = false
}: TemplateFiltersProps) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter available tags based on search query
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return availableTags;
    
    const query = searchQuery.toLowerCase().trim();
    return availableTags.filter(tag => 
      tag.toLowerCase().includes(query)
    );
  }, [availableTags, searchQuery]);

  // Handle tag selection/deselection
  const handleTagToggle = (tag: string) => {
    if (disabled) return;
    
    const isSelected = selectedTags.includes(tag);
    if (isSelected) {
      // Remove tag
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      // Add tag
      onTagsChange([...selectedTags, tag]);
    }
  };

  // Handle clear all filters
  const handleClearAll = () => {
    if (disabled) return;
    onTagsChange([]);
    setSearchQuery('');
  };

  // Handle clear individual tag
  const handleClearTag = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onTagsChange(selectedTags.filter(t => t !== tag));
  };

  // Auto-expand when tags are selected
  useEffect(() => {
    if (selectedTags.length > 0 && !isExpanded) {
      setIsExpanded(true);
    }
  }, [selectedTags.length, isExpanded]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, tag: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleTagToggle(tag);
    }
  };

  const hasSelectedTags = selectedTags.length > 0;
  const hasAvailableTags = availableTags.length > 0;

  return (
    <div className="space-y-3">
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          disabled={disabled || !hasAvailableTags}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg
            transition-all duration-200
            ${disabled || !hasAvailableTags
              ? 'text-neutral-600 cursor-not-allowed'
              : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
            }
            ${hasSelectedTags ? 'text-blue-400' : ''}
          `}
          aria-expanded={isExpanded}
          aria-controls="template-filters-content"
        >
          <FunnelIcon className="w-4 h-4" />
          <span className="text-sm font-medium">
            {t('templates.filters.title')}
            {hasSelectedTags && (
              <span className="ml-1 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                {selectedTags.length}
              </span>
            )}
          </span>
          {hasAvailableTags && (
            isExpanded ? (
              <ChevronUpIcon className="w-4 h-4" />
            ) : (
              <ChevronDownIcon className="w-4 h-4" />
            )
          )}
        </button>

        {/* Clear All Button */}
        {hasSelectedTags && (
          <button
            onClick={handleClearAll}
            disabled={disabled}
            className={`
              px-3 py-1 text-xs rounded-md
              transition-all duration-200
              ${disabled
                ? 'text-neutral-600 cursor-not-allowed'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-700'
              }
            `}
            title={t('action.clearFilters')}
          >
            {t('action.clearFilters')}
          </button>
        )}
      </div>

      {/* Selected Tags Display (Always Visible) */}
      {hasSelectedTags && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <div
              key={tag}
              className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded-full"
            >
              <TagIcon className="w-3 h-3" />
              <span>{tag}</span>
              <button
                onClick={(e) => handleClearTag(tag, e)}
                disabled={disabled}
                className={`
                  ml-1 p-0.5 rounded-full
                  transition-colors duration-200
                  ${disabled
                    ? 'cursor-not-allowed opacity-50'
                    : 'hover:bg-blue-700'
                  }
                `}
                aria-label={`Remove ${tag} filter`}
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Filter Content */}
      {isExpanded && hasAvailableTags && (
        <div 
          id="template-filters-content"
          className="bg-neutral-900 border border-neutral-700 rounded-lg p-4 space-y-3"
        >
          {/* Search Tags */}
          {availableTags.length > 10 && (
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('templates.filters.searchPlaceholder')}
                disabled={disabled}
                className={`
                  w-full px-3 py-2 text-sm
                  bg-neutral-800 border border-neutral-600 rounded-md
                  text-white placeholder-neutral-400
                  transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-neutral-500'}
                `}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  disabled={disabled}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-white"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Tags Grid */}
          <div className="space-y-2">
            <div className="text-xs text-neutral-400 uppercase tracking-wide font-medium">
              {t('templates.filters.availableTags')} ({filteredTags.length})
            </div>
            
            {filteredTags.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {filteredTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      onKeyDown={(e) => handleKeyDown(e, tag)}
                      disabled={disabled}
                      className={`
                        flex items-center gap-2 px-3 py-2 text-sm rounded-md
                        transition-all duration-200
                        focus:outline-none focus:ring-2 focus:ring-blue-500
                        ${disabled
                          ? 'opacity-50 cursor-not-allowed'
                          : isSelected
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white border border-neutral-600 hover:border-neutral-500'
                        }
                      `}
                      aria-pressed={isSelected}
                      title={isSelected ? `Remove ${tag} filter` : `Add ${tag} filter`}
                    >
                      <TagIcon className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{tag}</span>
                      {isSelected && (
                        <div className="w-2 h-2 bg-white rounded-full flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-neutral-400 text-sm">
                {searchQuery ? (
                  <>
                    <TagIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>{t('templates.filters.noTagsFound')}</p>
                    <p className="text-xs mt-1">{t('templates.filters.tryDifferentSearch')}</p>
                  </>
                ) : (
                  <>
                    <TagIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>{t('templates.filters.noTagsAvailable')}</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-4 text-neutral-400 text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-neutral-600 border-t-blue-400 mr-2" />
              {t('templates.filters.loadingTags')}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!hasAvailableTags && !loading && (
        <div className="text-center py-4 text-neutral-500 text-sm">
          <FunnelIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>{t('templates.filters.noFiltersAvailable')}</p>
        </div>
      )}

      {/* Screen Reader Status */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {hasSelectedTags && `${selectedTags.length} filters applied: ${selectedTags.join(', ')}`}
        {loading && t('templates.filters.loadingTags')}
      </div>
    </div>
  );
}

export default TemplateFilters;