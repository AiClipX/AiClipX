import React, { useState, useCallback, useMemo } from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { Template, TemplateSearchParams } from '../types/templateTypes';
import { autofillFromTemplate, AutofillResult } from '../utils/templateAutofill';
import { TemplateList } from './TemplateList';
import { TemplateErrorBoundary } from './TemplateErrorBoundary';
import { useTemplateListQuery, useTemplateSelectionMutation } from '../hooks/useTemplateQuery';
import { 
  trackTemplateSelection, 
  trackTemplateSearch, 
  trackTemplateFilter,
  trackTemplateError,
  createPerformanceTimer 
} from '../utils/templateAnalytics';
import { safeLog } from '../../../../lib/config';

interface TemplateSelectorProps {
  onTemplateSelect: (autofillResult: AutofillResult, template: Template) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}

export type { TemplateSelectorProps };

export function TemplateSelector({
  onTemplateSelect,
  disabled = false,
  compact = false,
  className = '',
}: TemplateSelectorProps) {
  const { language } = useLanguage();
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Performance tracking
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof createPerformanceTimer> | null>(null);
  
  // Create search params for React Query
  const searchParams = useMemo((): TemplateSearchParams => ({
    q: searchQuery.trim() || undefined,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    limit: 50, // Reasonable limit for template selection
  }), [searchQuery, selectedTags]);

  // Use React Query hooks for data fetching and mutations
  const {
    data: queryData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useTemplateListQuery(searchParams);

  const templateSelectionMutation = useTemplateSelectionMutation();

  // Track search and filter analytics
  React.useEffect(() => {
    if (searchQuery.trim()) {
      // End previous search timer if exists
      if (searchTimer) {
        searchTimer.end(true, { query: searchQuery, resultCount: queryData?.data?.length || 0 });
      }
      
      // Start new search timer
      const timer = createPerformanceTimer('search');
      setSearchTimer(timer);
      
      // Track search event
      trackTemplateSearch(searchQuery.trim(), queryData?.data?.length || 0);
    }
  }, [searchQuery, queryData?.data?.length]);

  React.useEffect(() => {
    if (selectedTags.length > 0) {
      trackTemplateFilter(selectedTags, queryData?.data?.length || 0);
    }
  }, [selectedTags, queryData?.data?.length]);

  // Track errors
  React.useEffect(() => {
    if (isError && error) {
      const errorMessage = typeof error === 'string' ? error : (error as any)?.message || 'Unknown error';
      const requestId = (error as any)?.requestId;
      trackTemplateError('network', errorMessage, requestId);
    }
  }, [isError, error]);

  // Extract templates from query result
  const templates = queryData?.data || [];
  const showLoading = isLoading || (isFetching && templates.length === 0);

  // Handle search input
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Handle filter changes
  const handleFiltersChange = useCallback((params: TemplateSearchParams) => {
    setSearchQuery(params.q || '');
    setSelectedTags(params.tags || []);
  }, []);

  // Handle template selection with autofill logic
  const handleTemplateSelect = useCallback((template: Template) => {
    if (disabled) return;

    const selectionTimer = createPerformanceTimer('select');
    let autofillSuccess = false;

    try {
      // Generate autofill result based on current language
      const autofillResult = autofillFromTemplate(template, language);
      autofillSuccess = true;
      
      safeLog('[TemplateSelector] Template selected:', {
        templateId: template.id,
        templateName: template.name,
        language: language,
        autofillResult: {
          title: autofillResult.title,
          prompt: autofillResult.prompt,
          hasParams: !!autofillResult.params,
        },
      });

      // Track analytics
      const context = window.location.pathname.includes('/dashboard') ? 'modal' : 'page';
      trackTemplateSelection(template, language, context, autofillSuccess);

      // Add to recent templates using mutation (optimistic update)
      templateSelectionMutation.mutate(template.id, {
        onError: (storageError) => {
          // Log but don't fail - localStorage issues shouldn't break template selection
          safeLog('[TemplateSelector] Failed to save recent template:', storageError);
          trackTemplateError('storage', storageError.message);
        }
      });

      // Call the parent callback with autofill result and template
      onTemplateSelect(autofillResult, template);
      
      selectionTimer.end(true, { templateId: template.id, autofillSuccess });
      
    } catch (error: any) {
      safeLog('[TemplateSelector] Error during template selection:', error);
      
      // Track error
      trackTemplateError('data', error.message || 'Template selection failed');
      
      // Still try to call the callback with basic template data
      const fallbackResult: AutofillResult = {
        title: template.defaults.title,
        prompt: template.defaults.prompt,
        params: template.defaults.params,
      };
      onTemplateSelect(fallbackResult, template);
      
      selectionTimer.end(false, { templateId: template.id, error: error.message });
    }
  }, [disabled, language, onTemplateSelect, templateSelectionMutation]);

  // Handle retry with error clearing
  const handleRetry = useCallback(() => {
    safeLog('[TemplateSelector] Retrying template fetch');
    refetch();
  }, [refetch]);

  // Handle graceful degradation when templates fail
  const handleTemplateFailure = useCallback(() => {
    safeLog('[TemplateSelector] Template system failed, allowing manual form entry');
    // Templates failed, but user can still create videos manually
    // This is handled by the parent component
  }, []);

  // Format error message for display
  const errorMessage = useMemo(() => {
    if (!isError || !error) return null;
    
    // If error is already processed by global handler, use it directly
    if (error && typeof error === 'object' && 'message' in error) {
      return error;
    }
    
    // Fallback for unprocessed errors
    const fallbackMessage = (error as any)?.message || 'Failed to load templates';
    const requestId = (error as any)?.requestId;
    
    return {
      message: fallbackMessage,
      requestId,
      timestamp: Date.now(),
      userSafe: true,
    };
  }, [isError, error]);

  return (
    <TemplateErrorBoundary 
      context="TemplateSelector"
      onRetry={handleRetry}
    >
      <div className={`template-selector ${className}`}>
        <TemplateList
          templates={templates}
          loading={showLoading}
          error={errorMessage}
          onTemplateSelect={handleTemplateSelect}
          onSearch={handleSearch}
          onFiltersChange={handleFiltersChange}
          onRetry={handleRetry}
          onErrorDismiss={handleTemplateFailure}
          searchQuery={searchQuery}
          selectedTags={selectedTags}
          disabled={disabled}
          compact={compact}
        />
      </div>
    </TemplateErrorBoundary>
  );
}

export default TemplateSelector;