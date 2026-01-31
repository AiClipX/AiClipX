import { safeLog } from '../../../../lib/config';
import { Template } from '../types/templateTypes';

/* =====================
   Analytics Event Types
===================== */

interface TemplateAnalyticsEvent {
  event: string;
  templateId?: string;
  templateName?: string;
  searchQuery?: string;
  selectedTags?: string[];
  timestamp: number;
  sessionId: string;
  language?: string;
  context?: string;
}

interface TemplateSelectionEvent extends TemplateAnalyticsEvent {
  event: 'template_selected';
  templateId: string;
  templateName: string;
  language: string;
  context: 'modal' | 'page';
  autofillSuccess: boolean;
}

interface TemplateSearchEvent extends TemplateAnalyticsEvent {
  event: 'template_search';
  searchQuery: string;
  resultCount: number;
  searchDuration?: number;
}

interface TemplateFilterEvent extends TemplateAnalyticsEvent {
  event: 'template_filter';
  selectedTags: string[];
  resultCount: number;
}

interface TemplateErrorEvent extends TemplateAnalyticsEvent {
  event: 'template_error';
  errorType: 'network' | 'data' | 'storage' | 'validation';
  errorMessage: string;
  requestId?: string;
}

/* =====================
   Session Management
===================== */

let sessionId: string | null = null;

function getSessionId(): string {
  if (!sessionId) {
    sessionId = `template_session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
  return sessionId;
}

/* =====================
   Analytics Functions
===================== */

/**
 * Track template selection events
 */
export function trackTemplateSelection(
  template: Template,
  language: string,
  context: 'modal' | 'page',
  autofillSuccess: boolean = true
): void {
  const event: TemplateSelectionEvent = {
    event: 'template_selected',
    templateId: template.id,
    templateName: template.name,
    language,
    context,
    autofillSuccess,
    timestamp: Date.now(),
    sessionId: getSessionId(),
  };

  // Log for development/debugging
  safeLog('[TemplateAnalytics] Template selected:', {
    templateId: template.id,
    templateName: template.name,
    tags: template.tags,
    context,
    language,
    autofillSuccess,
  });

  // In a real application, you would send this to your analytics service
  // For now, we'll just store it locally for potential future use
  storeAnalyticsEvent(event);
}

/**
 * Track template search events
 */
export function trackTemplateSearch(
  searchQuery: string,
  resultCount: number,
  searchDuration?: number
): void {
  const event: TemplateSearchEvent = {
    event: 'template_search',
    searchQuery,
    resultCount,
    searchDuration,
    timestamp: Date.now(),
    sessionId: getSessionId(),
  };

  safeLog('[TemplateAnalytics] Template search:', {
    query: searchQuery,
    resultCount,
    searchDuration,
  });

  storeAnalyticsEvent(event);
}

/**
 * Track template filter events
 */
export function trackTemplateFilter(
  selectedTags: string[],
  resultCount: number
): void {
  const event: TemplateFilterEvent = {
    event: 'template_filter',
    selectedTags,
    resultCount,
    timestamp: Date.now(),
    sessionId: getSessionId(),
  };

  safeLog('[TemplateAnalytics] Template filter:', {
    selectedTags,
    resultCount,
  });

  storeAnalyticsEvent(event);
}

/**
 * Track template error events
 */
export function trackTemplateError(
  errorType: 'network' | 'data' | 'storage' | 'validation',
  errorMessage: string,
  requestId?: string
): void {
  const event: TemplateErrorEvent = {
    event: 'template_error',
    errorType,
    errorMessage,
    requestId,
    timestamp: Date.now(),
    sessionId: getSessionId(),
  };

  safeLog('[TemplateAnalytics] Template error:', {
    errorType,
    errorMessage,
    requestId,
  });

  storeAnalyticsEvent(event);
}

/**
 * Track template system performance metrics
 */
export function trackTemplatePerformance(
  operation: 'fetch' | 'search' | 'filter' | 'select',
  duration: number,
  success: boolean,
  metadata?: Record<string, any>
): void {
  const event: TemplateAnalyticsEvent = {
    event: 'template_performance',
    timestamp: Date.now(),
    sessionId: getSessionId(),
    ...metadata,
  };

  safeLog('[TemplateAnalytics] Template performance:', {
    operation,
    duration,
    success,
    metadata,
  });

  storeAnalyticsEvent(event);
}

/* =====================
   Storage and Retrieval
===================== */

const ANALYTICS_STORAGE_KEY = 'template_analytics_events';
const MAX_STORED_EVENTS = 100; // Limit storage to prevent bloat

function storeAnalyticsEvent(event: TemplateAnalyticsEvent): void {
  if (typeof window === 'undefined') return;

  try {
    const stored = localStorage.getItem(ANALYTICS_STORAGE_KEY);
    const events: TemplateAnalyticsEvent[] = stored ? JSON.parse(stored) : [];
    
    // Add new event
    events.push(event);
    
    // Keep only the most recent events
    const limitedEvents = events.slice(-MAX_STORED_EVENTS);
    
    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(limitedEvents));
  } catch (error) {
    safeLog('[TemplateAnalytics] Failed to store analytics event:', error);
    // Don't throw - analytics failures shouldn't break the app
  }
}

/**
 * Get stored analytics events (for debugging or export)
 */
export function getStoredAnalyticsEvents(): TemplateAnalyticsEvent[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(ANALYTICS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    safeLog('[TemplateAnalytics] Failed to retrieve analytics events:', error);
    return [];
  }
}

/**
 * Clear stored analytics events
 */
export function clearAnalyticsEvents(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(ANALYTICS_STORAGE_KEY);
    safeLog('[TemplateAnalytics] Analytics events cleared');
  } catch (error) {
    safeLog('[TemplateAnalytics] Failed to clear analytics events:', error);
  }
}

/**
 * Get analytics summary for debugging
 */
export function getAnalyticsSummary(): {
  totalEvents: number;
  eventTypes: Record<string, number>;
  templateSelections: number;
  searchQueries: number;
  errors: number;
  sessionId: string;
} {
  const events = getStoredAnalyticsEvents();
  const eventTypes: Record<string, number> = {};
  
  events.forEach(event => {
    eventTypes[event.event] = (eventTypes[event.event] || 0) + 1;
  });

  return {
    totalEvents: events.length,
    eventTypes,
    templateSelections: eventTypes['template_selected'] || 0,
    searchQueries: eventTypes['template_search'] || 0,
    errors: eventTypes['template_error'] || 0,
    sessionId: getSessionId(),
  };
}

/* =====================
   Performance Utilities
===================== */

/**
 * Create a performance timer for tracking operation duration
 */
export function createPerformanceTimer(operation: string) {
  const startTime = performance.now();
  
  return {
    end: (success: boolean = true, metadata?: Record<string, any>) => {
      const duration = performance.now() - startTime;
      trackTemplatePerformance(operation as any, duration, success, metadata);
      return duration;
    }
  };
}

/**
 * Decorator for tracking function performance
 */
export function withPerformanceTracking<T extends (...args: any[]) => any>(
  fn: T,
  operation: string
): T {
  return ((...args: any[]) => {
    const timer = createPerformanceTimer(operation);
    
    try {
      const result = fn(...args);
      
      // Handle promises
      if (result && typeof result.then === 'function') {
        return result
          .then((value: any) => {
            timer.end(true);
            return value;
          })
          .catch((error: any) => {
            timer.end(false, { error: error.message });
            throw error;
          });
      }
      
      // Handle synchronous functions
      timer.end(true);
      return result;
    } catch (error: any) {
      timer.end(false, { error: error.message });
      throw error;
    }
  }) as T;
}