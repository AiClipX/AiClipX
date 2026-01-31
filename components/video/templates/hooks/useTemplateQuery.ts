import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "../../../../contexts/AuthContext";
import { 
  fetchTemplates, 
  getTemplateById, 
  getTemplateTags,
  addRecentTemplate,
  getRecentTemplates,
  clearRecentTemplates
} from "../services/templateService";
import { 
  Template, 
  TemplateSearchParams, 
  TemplateResponse,
  RecentTemplate 
} from "../types/templateTypes";

/* =====================
   Constants
===================== */
const TEMPLATE_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const TEMPLATE_CACHE_TIME = 10 * 60 * 1000; // 10 minutes
const RECENT_TEMPLATES_STALE_TIME = 30 * 1000; // 30 seconds
const RECENT_TEMPLATES_CACHE_TIME = 60 * 1000; // 1 minute

/* =====================
   Query Key Factories
===================== */
export const templateQueryKeys = {
  all: ['templates'] as const,
  lists: () => [...templateQueryKeys.all, 'list'] as const,
  list: (params: TemplateSearchParams) => [...templateQueryKeys.lists(), params] as const,
  details: () => [...templateQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...templateQueryKeys.details(), id] as const,
  recent: () => [...templateQueryKeys.all, 'recent'] as const,
  tags: () => [...templateQueryKeys.all, 'tags'] as const,
};

/* =====================
   Template List Query Hook
===================== */
export function useTemplateListQuery(params: TemplateSearchParams = {}) {
  const { token, isLoading: authLoading, isValidating } = useAuth();

  return useQuery({
    queryKey: templateQueryKeys.list(params),
    queryFn: async ({ signal }) => {
      console.log('[useTemplateListQuery] Fetching templates with params:', params);
      return await fetchTemplates(params);
    },
    enabled: !!token && !authLoading && !isValidating,
    staleTime: TEMPLATE_STALE_TIME,
    gcTime: TEMPLATE_CACHE_TIME,
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchOnWindowFocus: false, // Don't refetch on window focus for templates
    refetchOnMount: 'always', // Always refetch on mount to get fresh data
  });
}

/* =====================
   Template Detail Query Hook
===================== */
export function useTemplateDetailQuery(templateId: string | null) {
  const { token, isLoading: authLoading, isValidating } = useAuth();

  return useQuery({
    queryKey: templateQueryKeys.detail(templateId || ''),
    queryFn: async ({ signal }) => {
      if (!templateId) return null;
      console.log('[useTemplateDetailQuery] Fetching template:', templateId);
      return await getTemplateById(templateId);
    },
    enabled: !!templateId && !!token && !authLoading && !isValidating,
    staleTime: TEMPLATE_STALE_TIME,
    gcTime: TEMPLATE_CACHE_TIME,
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors or 404s
      if (error?.response?.status === 401 || 
          error?.response?.status === 403 || 
          error?.response?.status === 404) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/* =====================
   Template Tags Query Hook
===================== */
export function useTemplateTagsQuery() {
  const { token, isLoading: authLoading, isValidating } = useAuth();

  return useQuery({
    queryKey: templateQueryKeys.tags(),
    queryFn: async () => {
      console.log('[useTemplateTagsQuery] Fetching template tags');
      return await getTemplateTags();
    },
    enabled: !!token && !authLoading && !isValidating,
    staleTime: TEMPLATE_STALE_TIME, // Tags don't change often
    gcTime: TEMPLATE_CACHE_TIME,
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: false, // Tags rarely change
  });
}

/* =====================
   Recent Templates Query Hook
===================== */
export function useRecentTemplatesQuery() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: templateQueryKeys.recent(),
    queryFn: async () => {
      console.log('[useRecentTemplatesQuery] Fetching recent templates from localStorage');
      const recentTemplateIds = getRecentTemplates();
      
      // If no recent templates, return empty array
      if (recentTemplateIds.length === 0) {
        return [];
      }

      // Fetch full template data for recent templates
      const templates: Template[] = [];
      
      for (const recentTemplate of recentTemplateIds) {
        try {
          // Try to get from cache first
          const cachedTemplate = queryClient.getQueryData(
            templateQueryKeys.detail(recentTemplate.templateId)
          ) as Template | undefined;
          
          if (cachedTemplate) {
            templates.push(cachedTemplate);
          } else {
            // Fetch from API if not in cache
            const template = await getTemplateById(recentTemplate.templateId);
            if (template) {
              templates.push(template);
              // Cache the result
              queryClient.setQueryData(
                templateQueryKeys.detail(recentTemplate.templateId),
                template
              );
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch recent template ${recentTemplate.templateId}:`, error);
          // Continue with other templates
        }
      }

      return templates;
    },
    staleTime: RECENT_TEMPLATES_STALE_TIME,
    gcTime: RECENT_TEMPLATES_CACHE_TIME,
    refetchOnWindowFocus: false,
    retry: false, // Don't retry localStorage operations
  });
}

/* =====================
   Template Selection Mutation Hook
===================== */
export function useTemplateSelectionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      console.log('[useTemplateSelectionMutation] Adding template to recent:', templateId);
      addRecentTemplate(templateId);
      return templateId;
    },
    onSuccess: (templateId) => {
      // Invalidate recent templates query to refresh the list
      queryClient.invalidateQueries({
        queryKey: templateQueryKeys.recent(),
      });
      
      console.log(`Template ${templateId} added to recent templates`);
    },
    onError: (error) => {
      console.error('Failed to add template to recent:', error);
    },
  });
}

/* =====================
   Clear Recent Templates Mutation Hook
===================== */
export function useClearRecentTemplatesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      console.log('[useClearRecentTemplatesMutation] Clearing recent templates');
      clearRecentTemplates();
    },
    onSuccess: () => {
      // Invalidate recent templates query to refresh the list
      queryClient.invalidateQueries({
        queryKey: templateQueryKeys.recent(),
      });
      
      console.log('Recent templates cleared');
    },
    onError: (error) => {
      console.error('Failed to clear recent templates:', error);
    },
  });
}

/* =====================
   Prefetch Utilities
===================== */
export function usePrefetchTemplate() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  const prefetchTemplate = async (templateId: string) => {
    if (!token) return;

    await queryClient.prefetchQuery({
      queryKey: templateQueryKeys.detail(templateId),
      queryFn: () => getTemplateById(templateId),
      staleTime: TEMPLATE_STALE_TIME,
    });
  };

  const prefetchTemplates = async (params: TemplateSearchParams = {}) => {
    if (!token) return;

    await queryClient.prefetchQuery({
      queryKey: templateQueryKeys.list(params),
      queryFn: () => fetchTemplates(params),
      staleTime: TEMPLATE_STALE_TIME,
    });
  };

  return {
    prefetchTemplate,
    prefetchTemplates,
  };
}

/* =====================
   Cache Management Utilities
===================== */
export function useTemplateCacheUtils() {
  const queryClient = useQueryClient();

  const invalidateAllTemplates = () => {
    queryClient.invalidateQueries({
      queryKey: templateQueryKeys.all,
    });
  };

  const invalidateTemplateList = (params?: TemplateSearchParams) => {
    if (params) {
      queryClient.invalidateQueries({
        queryKey: templateQueryKeys.list(params),
      });
    } else {
      queryClient.invalidateQueries({
        queryKey: templateQueryKeys.lists(),
      });
    }
  };

  const invalidateTemplate = (templateId: string) => {
    queryClient.invalidateQueries({
      queryKey: templateQueryKeys.detail(templateId),
    });
  };

  const removeTemplateFromCache = (templateId: string) => {
    queryClient.removeQueries({
      queryKey: templateQueryKeys.detail(templateId),
    });
  };

  const setTemplateData = (templateId: string, template: Template) => {
    queryClient.setQueryData(
      templateQueryKeys.detail(templateId),
      template
    );
  };

  const getTemplateFromCache = (templateId: string): Template | undefined => {
    return queryClient.getQueryData(
      templateQueryKeys.detail(templateId)
    ) as Template | undefined;
  };

  return {
    invalidateAllTemplates,
    invalidateTemplateList,
    invalidateTemplate,
    removeTemplateFromCache,
    setTemplateData,
    getTemplateFromCache,
  };
}