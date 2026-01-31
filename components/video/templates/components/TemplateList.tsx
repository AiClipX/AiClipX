import React, { useMemo } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { Template, TemplateSearchParams } from '../types/templateTypes';
import { TemplateCard } from './TemplateCard';
import { TemplateSearch } from './TemplateSearch';
import { TemplateFilters } from './TemplateFilters';
import { TemplateErrorDisplay } from './TemplateErrorDisplay';
import { TemplateListSkeleton } from './TemplateListSkeleton';
import { useRecentTemplatesQuery, useTemplateTagsQuery } from '../hooks/useTemplateQuery';
import { ErrorInfo } from '../../../../lib/globalErrorHandler';
import { 
  MagnifyingGlassIcon,
  SparklesIcon,
  ClockIcon,
  WifiIcon
} from '@heroicons/react/24/outline';

interface TemplateListProps {
  templates: Template[];
  loading?: boolean;
  error?: string | ErrorInfo | null;
  onTemplateSelect: (template: Template) => void;
  onSearch?: (query: string) => void;
  onFiltersChange?: (params: TemplateSearchParams) => void;
  onRetry?: () => void;
  onErrorDismiss?: () => void;
  searchQuery?: string;
  selectedTags?: string[];
  disabled?: boolean;
  compact?: boolean;
}

export type { TemplateListProps };

export function TemplateList({
  templates,
  loading = false,
  error = null,
  onTemplateSelect,
  onSearch,
  onFiltersChange,
  onRetry,
  onErrorDismiss,
  searchQuery = '',
  selectedTags = [],
  disabled = false,
  compact = false
}: TemplateListProps) {
  const { t } = useLanguage();
  
  // Use React Query to fetch recent templates and tags
  const { 
    data: recentTemplatesData = []
  } = useRecentTemplatesQuery();

  const {
    data: availableTags = [],
    isLoading: tagsLoading
  } = useTemplateTagsQuery();

  // Separate recent and regular templates
  const { recentTemplates, regularTemplates } = useMemo(() => {
    const recentTemplateIds = recentTemplatesData.map(t => t.id);
    const recent: Template[] = [];
    const regular: Template[] = [];

    // Use the recent templates from React Query directly
    recent.push(...recentTemplatesData);

    // Filter out recent templates from the main list
    templates.forEach(template => {
      if (!recentTemplateIds.includes(template.id)) {
        regular.push(template);
      }
    });

    return { recentTemplates: recent, regularTemplates: regular };
  }, [templates, recentTemplatesData]);

  // Handle search
  const handleSearch = (query: string) => {
    if (onSearch) {
      onSearch(query);
    }
  };

  // Handle filter changes
  const handleTagsChange = (tags: string[]) => {
    if (onFiltersChange) {
      onFiltersChange({
        q: searchQuery,
        tags: tags.length > 0 ? tags : undefined
      });
    }
  };

  // Handle template selection
  const handleTemplateSelect = (template: Template) => {
    if (!disabled) {
      onTemplateSelect(template);
      // Recent templates will be updated via the mutation in TemplateSelector
    }
  };

  // Loading state with skeleton
  if (loading && templates.length === 0) {
    return (
      <TemplateListSkeleton 
        showRecentSection={recentTemplatesData.length > 0}
        recentCount={Math.min(recentTemplatesData.length, 3)}
        templateCount={6}
      />
    );
  }

  // Error state with enhanced error display
  if (error && templates.length === 0) {
    return (
      <div className="space-y-6">
        {/* Search and filters (still functional during error) */}
        <div className="space-y-4">
          <TemplateSearch
            onSearch={handleSearch}
            disabled={disabled}
            loading={loading}
          />
          <TemplateFilters
            availableTags={availableTags}
            selectedTags={selectedTags}
            onTagsChange={handleTagsChange}
            disabled={disabled}
            loading={tagsLoading}
          />
        </div>

        {/* Enhanced error display */}
        <TemplateErrorDisplay
          error={error}
          onRetry={onRetry}
          onDismiss={onErrorDismiss}
          context="template-list"
        />

        {/* Graceful degradation message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <WifiIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800 mb-1">
                {t('templates.error.gracefulDegradation.title')}
              </p>
              <p className="text-sm text-blue-700">
                {t('templates.error.gracefulDegradation.description')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state (no templates found) with enhanced messaging
  if (templates.length === 0 && !loading) {
    const hasFilters = searchQuery.trim() || selectedTags.length > 0;
    
    return (
      <div className="space-y-6">
        {/* Search and filters */}
        <div className="space-y-4">
          <TemplateSearch
            onSearch={handleSearch}
            disabled={disabled}
            loading={loading}
          />
          <TemplateFilters
            availableTags={availableTags}
            selectedTags={selectedTags}
            onTagsChange={handleTagsChange}
            disabled={disabled}
            loading={tagsLoading}
          />
        </div>

        {/* Enhanced empty state */}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MagnifyingGlassIcon className="w-16 h-16 text-neutral-500 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            {hasFilters ? t('templates.empty.noSearchResultsTitle') : t('templates.empty.noTemplatesTitle')}
          </h3>
          <p className="text-neutral-400 mb-6 max-w-md">
            {hasFilters 
              ? t('templates.empty.noSearchResultsDescription')
              : t('templates.empty.noTemplatesDescription')
            }
          </p>
          
          {/* Action buttons based on state */}
          <div className="flex flex-col sm:flex-row gap-3">
            {hasFilters && (
              <button
                onClick={() => {
                  handleSearch('');
                  handleTagsChange([]);
                }}
                className="px-4 py-2 bg-neutral-700 text-white rounded-lg hover:bg-neutral-600 transition-colors duration-200"
              >
                {t('action.clearFilters')}
              </button>
            )}
            
            {/* Graceful degradation - allow manual creation */}
            <div className="text-sm text-neutral-500 mt-4">
              <p>{t('templates.error.gracefulDegradation.description')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters - Hidden in compact mode */}
      {!compact && (
        <div className="space-y-4">
          <TemplateSearch
            onSearch={handleSearch}
            disabled={disabled}
            loading={loading}
          />
          <TemplateFilters
            availableTags={availableTags}
            selectedTags={selectedTags}
            onTagsChange={handleTagsChange}
            disabled={disabled}
            loading={tagsLoading}
          />
        </div>
      )}

      {/* Recent Templates Section */}
      {recentTemplates.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-blue-400" />
            <h2 className={`font-semibold text-white ${compact ? 'text-sm' : 'text-lg'}`}>
              {t('templates.list.recentTemplates')}
            </h2>
            <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded-full">
              {recentTemplates.length}
            </span>
          </div>
          
          <div className={`grid gap-4 ${
            compact 
              ? 'grid-cols-1' 
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}>
            {recentTemplates.map((template) => (
              <TemplateCard
                key={`recent-${template.id}`}
                template={template}
                onSelect={handleTemplateSelect}
                isRecent={true}
                disabled={disabled}
                compact={compact}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Templates Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-5 h-5 text-neutral-400" />
          <h2 className="text-lg font-semibold text-white">
            {recentTemplates.length > 0 ? t('templates.list.allTemplates') : t('templates.list.templates')}
          </h2>
          <span className="px-2 py-1 bg-neutral-700 text-neutral-300 text-xs rounded-full">
            {regularTemplates.length}
          </span>
          {loading && (
            <div className="flex items-center gap-2 text-neutral-400 text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-neutral-600 border-t-blue-400" />
              <span className="hidden sm:inline">{t('empty.loading')}</span>
            </div>
          )}
        </div>

        {regularTemplates.length > 0 ? (
          <div className={`grid gap-4 ${
            compact 
              ? 'grid-cols-1' 
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}>
            {regularTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={handleTemplateSelect}
                isRecent={false}
                disabled={disabled}
                compact={compact}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-neutral-500">
            <SparklesIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{t('templates.list.noAdditionalTemplates')}</p>
          </div>
        )}
      </div>

      {/* Loading overlay for additional content */}
      {loading && templates.length > 0 && (
        <div className="flex justify-center py-4">
          <div className="flex items-center gap-2 text-neutral-400 text-sm">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-neutral-600 border-t-blue-400" />
            <span>{t('templates.list.loadingMore')}</span>
          </div>
        </div>
      )}

      {/* Screen reader status */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {loading && 'Loading templates...'}
        {error && `Error loading templates: ${error}`}
        {templates.length > 0 && `${templates.length} templates available`}
        {recentTemplates.length > 0 && `${recentTemplates.length} recently used templates`}
      </div>
    </div>
  );
}

export default TemplateList;