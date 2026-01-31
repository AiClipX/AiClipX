import { SupportedLanguage } from '../../../../lib/i18n';

/**
 * Core template interface representing a video template with localization support
 */
export interface Template {
  id: string;
  name: string;
  description: string;
  tags: string[];
  useCase: string;
  defaults: {
    title: string;
    prompt: string;
    params?: Record<string, any>;
  };
  localized: {
    [locale in SupportedLanguage]?: {
      name: string;
      description: string;
      useCase: string;
      defaults: {
        title: string;
        prompt: string;
      };
    };
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Search and filter parameters for template queries
 */
export interface TemplateSearchParams {
  q?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

/**
 * API response structure for template list queries
 */
export interface TemplateResponse {
  data: Template[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
}

/**
 * Recently used template entry for local storage
 */
export interface RecentTemplate {
  templateId: string;
  usedAt: string; // ISO timestamp
}

/**
 * Local storage schema for template-related data
 */
export interface TemplateLocalStorage {
  recentTemplates: RecentTemplate[];
  version: string; // For future migrations
}

/**
 * Error response structure from template API
 */
export interface TemplateErrorResponse {
  error: string;
  message: string;
  requestId?: string;
}