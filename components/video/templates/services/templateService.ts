import { 
  Template, 
  TemplateSearchParams, 
  TemplateResponse, 
  RecentTemplate, 
  TemplateLocalStorage 
} from '../types/templateTypes';
import { generateRequestId } from '../../../../lib/authErrorHandler';
import { handleError } from '../../../../lib/globalErrorHandler';
import { safeLog } from '../../../../lib/config';
import { getFilteredTemplates, getTemplateById as getMockTemplateById, getAllTags } from '../data/mockTemplates';

/* =====================
   Constants
===================== */

const RECENT_TEMPLATES_KEY = 'recentTemplates';
const RECENT_TEMPLATES_LIMIT = 5;
const STORAGE_VERSION = '1.0';
const USE_MOCK_DATA = true; // Set to false when API is ready

/* =====================
   Error Handling Helpers
===================== */

function isNetworkError(error: any): boolean {
  return (
    !error.response || 
    error.code === 'NETWORK_ERROR' ||
    error.code === 'ECONNABORTED' ||
    error.message?.toLowerCase().includes('network') ||
    error.message?.toLowerCase().includes('timeout') ||
    error.status === 0
  );
}

function isOfflineError(error: any): boolean {
  return (
    !navigator.onLine ||
    error.code === 'NETWORK_ERROR' ||
    error.status === 0
  );
}

function createEnhancedError(error: any, requestId: string) {
  let enhancedError: any;
  
  if (isOfflineError(error)) {
    enhancedError = new Error('You appear to be offline. Please check your internet connection.');
    enhancedError.code = 'OFFLINE';
    enhancedError.userSafe = true;
  } else if (isNetworkError(error)) {
    enhancedError = new Error('Network connection failed. Please check your internet connection and try again.');
    enhancedError.code = 'NETWORK_ERROR';
    enhancedError.userSafe = true;
  } else {
    enhancedError = new Error(error?.response?.data?.message || error?.message || 'Failed to load templates');
  }
  
  enhancedError.requestId = requestId;
  enhancedError.status = error?.response?.status || error?.status || 0;
  enhancedError.response = error?.response;
  enhancedError.originalError = error;
  
  return enhancedError;
}

function parseTemplate(raw: any): Template {
  // Validate basic structure
  if (!validateTemplate(raw)) {
    throw new Error('Invalid template data structure');
  }
  
  const template: Template = {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    tags: raw.tags || [],
    useCase: raw.useCase || '',
    defaults: {
      title: raw.defaults?.title || '',
      prompt: raw.defaults?.prompt || '',
      params: raw.defaults?.params,
    },
    localized: raw.localized || {},
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
  
  // Sanitize the template data
  return sanitizeTemplate(template);
}

function buildTemplateParams(params: TemplateSearchParams): Record<string, string> {
  const queryParams: Record<string, string> = {};
  
  if (params.q && params.q.trim()) {
    queryParams.q = params.q.trim();
  }
  
  if (params.tags && params.tags.length > 0) {
    queryParams.tags = params.tags.join(',');
  }
  
  if (params.limit) {
    queryParams.limit = params.limit.toString();
  }
  
  if (params.offset) {
    queryParams.offset = params.offset.toString();
  }
  
  return queryParams;
}

/* =====================
   API Functions
===================== */

export async function fetchTemplates(params: TemplateSearchParams = {}): Promise<TemplateResponse> {
  const requestId = generateRequestId();
  
  try {
    // Use mock data for now
    if (USE_MOCK_DATA) {
      // Simulate API delay for realistic UX
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const result = getFilteredTemplates(
        params.q,
        params.tags,
        params.limit,
        params.offset
      );
      
      safeLog('[TemplateService] Fetched templates from mock data', {
        query: params.q,
        tags: params.tags,
        count: result.data.length,
        total: result.total
      });
      
      return result;
    }
    
    // Original API code (kept for future use)
    const queryParams = new URLSearchParams(buildTemplateParams(params));
    const axios = (await import('../../../../lib/apiClient')).default;
    
    const response = await axios.get(`/api/templates?${queryParams}`, {
      headers: { "X-Request-Id": requestId },
      timeout: 10000, // 10 second timeout
    });
    
    return {
      data: response.data.data.map(parseTemplate),
      total: response.data.total || 0,
      hasMore: response.data.hasMore || false,
      nextOffset: response.data.nextOffset,
    };
  } catch (error: any) {
    safeLog("Fetch templates error (no sensitive data)", { 
      hasError: !!error, 
      requestId,
      isNetworkError: isNetworkError(error),
      isOffline: isOfflineError(error),
      status: error?.response?.status || error?.status || 0
    });
    
    // Handle 503 Service Unavailable specifically
    if (error?.response?.status === 503) {
      // Return empty result set for 503 errors to prevent app crash
      safeLog("Service temporarily unavailable, returning empty result set");
      return {
        data: [],
        total: 0,
        hasMore: false,
        nextOffset: undefined,
      };
    }
    
    // Create enhanced error with better user messaging
    const enhancedError = createEnhancedError(error, requestId);
    
    // Process through global error handler for consistent formatting
    throw handleError(enhancedError, 'TemplateService.fetchTemplates');
  }
}

export async function getTemplateById(id: string): Promise<Template | null> {
  const requestId = generateRequestId();
  
  try {
    // Use mock data for now
    if (USE_MOCK_DATA) {
      // Simulate API delay for realistic UX
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const template = getMockTemplateById(id);
      
      safeLog('[TemplateService] Fetched template by ID from mock data', {
        templateId: id,
        found: !!template
      });
      
      return template;
    }
    
    // Original API code (kept for future use)
    const axios = (await import('../../../../lib/apiClient')).default;
    
    const response = await axios.get(`/api/templates/${id}`, {
      headers: { "X-Request-Id": requestId },
      timeout: 10000, // 10 second timeout
    });
    
    return parseTemplate(response.data);
  } catch (error: any) {
    // 404 is expected - template not found
    if (error?.response?.status === 404) {
      return null;
    }
    
    safeLog("Get template by ID error (no sensitive data)", { 
      hasError: !!error, 
      requestId, 
      templateId: id,
      isNetworkError: isNetworkError(error),
      isOffline: isOfflineError(error),
      status: error?.response?.status || error?.status || 0
    });
    
    // Create enhanced error with better user messaging
    const enhancedError = createEnhancedError(error, requestId);
    
    // Process through global error handler for consistent formatting
    throw handleError(enhancedError, 'TemplateService.getTemplateById');
  }
}

/**
 * Get all available template tags
 */
export async function getTemplateTags(): Promise<string[]> {
  try {
    // Use mock data for now
    if (USE_MOCK_DATA) {
      // Simulate API delay for realistic UX
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const tags = getAllTags();
      
      safeLog('[TemplateService] Fetched template tags from mock data', {
        count: tags.length,
        tags
      });
      
      return tags;
    }
    
    // Original API code (kept for future use)
    const axios = (await import('../../../../lib/apiClient')).default;
    const requestId = generateRequestId();
    
    const response = await axios.get('/api/templates/tags', {
      headers: { "X-Request-Id": requestId },
      timeout: 5000,
    });
    
    return response.data.tags || [];
  } catch (error: any) {
    safeLog("Get template tags error", { hasError: !!error });
    
    // Return empty array on error to prevent UI breaking
    return [];
  }
}

/* =====================
   Local Storage Functions
===================== */

function getStorageData(): TemplateLocalStorage {
  if (typeof window === 'undefined') {
    return { recentTemplates: [], version: STORAGE_VERSION };
  }
  
  try {
    const stored = localStorage.getItem(RECENT_TEMPLATES_KEY);
    if (!stored) {
      return { recentTemplates: [], version: STORAGE_VERSION };
    }
    
    const parsed = JSON.parse(stored);
    
    // Handle version migration if needed
    if (!parsed.version || parsed.version !== STORAGE_VERSION) {
      safeLog('Template storage version mismatch, resetting');
      return { recentTemplates: [], version: STORAGE_VERSION };
    }
    
    // Validate data structure
    if (!Array.isArray(parsed.recentTemplates)) {
      safeLog('Invalid recent templates data structure, resetting');
      return { recentTemplates: [], version: STORAGE_VERSION };
    }
    
    return parsed;
  } catch (error) {
    safeLog('Failed to parse recent templates from localStorage', error);
    
    // Try to clear corrupted data
    try {
      localStorage.removeItem(RECENT_TEMPLATES_KEY);
    } catch (clearError) {
      safeLog('Failed to clear corrupted localStorage data', clearError);
    }
    
    return { recentTemplates: [], version: STORAGE_VERSION };
  }
}

function saveStorageData(data: TemplateLocalStorage): void {
  if (typeof window === 'undefined') return;
  
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(RECENT_TEMPLATES_KEY, serialized);
  } catch (error: any) {
    safeLog('Failed to save recent templates to localStorage', error);
    
    // Handle quota exceeded error
    if (error.name === 'QuotaExceededError' || error.code === 22) {
      safeLog('localStorage quota exceeded, attempting cleanup');
      
      try {
        // Try to clear old data and save with fewer items
        const reducedData = {
          ...data,
          recentTemplates: data.recentTemplates.slice(0, 3) // Keep only 3 most recent
        };
        localStorage.setItem(RECENT_TEMPLATES_KEY, JSON.stringify(reducedData));
      } catch (retryError) {
        safeLog('Failed to save reduced recent templates data', retryError);
        // Don't throw - localStorage failures shouldn't break the app
      }
    }
    
    // Don't throw - localStorage failures shouldn't break the app
  }
}

export function getRecentTemplates(): RecentTemplate[] {
  const data = getStorageData();
  return data.recentTemplates;
}

export function addRecentTemplate(templateId: string): void {
  const data = getStorageData();
  const now = new Date().toISOString();
  
  // Remove existing entry if present
  const filtered = data.recentTemplates.filter(t => t.templateId !== templateId);
  
  // Add to front
  const updated = [{ templateId, usedAt: now }, ...filtered];
  
  // Keep only the most recent N templates
  const limited = updated.slice(0, RECENT_TEMPLATES_LIMIT);
  
  saveStorageData({
    recentTemplates: limited,
    version: STORAGE_VERSION,
  });
}

export function clearRecentTemplates(): void {
  saveStorageData({
    recentTemplates: [],
    version: STORAGE_VERSION,
  });
}

/* =====================
   Utility Functions
===================== */

/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
}

/**
 * Get localized template content based on current language
 */
export function getLocalizedTemplate(template: Template, locale: string): {
  name: string;
  description: string;
  useCase: string;
  title: string;
  prompt: string;
} {
  const localized = template.localized[locale as keyof typeof template.localized];
  
  return {
    name: localized?.name || template.name,
    description: localized?.description || template.description,
    useCase: localized?.useCase || template.useCase,
    title: localized?.defaults?.title || template.defaults.title,
    prompt: localized?.defaults?.prompt || template.defaults.prompt,
  };
}

/**
 * Validate template data structure
 */
export function validateTemplate(template: any): template is Template {
  return (
    template &&
    typeof template.id === 'string' &&
    typeof template.name === 'string' &&
    typeof template.description === 'string' &&
    Array.isArray(template.tags) &&
    template.defaults &&
    typeof template.defaults.title === 'string' &&
    typeof template.defaults.prompt === 'string'
  );
}

/**
 * Sanitize template data to prevent XSS
 */
export function sanitizeTemplate(template: Template): Template {
  // Basic sanitization - in a real app, use a proper sanitization library
  return {
    ...template,
    name: template.name.trim(),
    description: template.description.trim(),
    useCase: template.useCase.trim(),
    defaults: {
      ...template.defaults,
      title: template.defaults.title.trim(),
      prompt: template.defaults.prompt.trim(),
    }
  };
}