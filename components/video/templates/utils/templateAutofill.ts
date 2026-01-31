import { Template } from '../types/templateTypes';
import { SupportedLanguage } from '../../../../lib/i18n';

/**
 * Result of template autofill operation
 */
export interface AutofillResult {
  title: string;
  prompt: string;
  params?: Record<string, any>;
}

/**
 * Autofill form fields from a template based on the specified locale
 * 
 * Property 1: Template autofill completeness
 * For any valid template, selecting it should autofill all specified form fields 
 * (title, prompt, and parameters if present) with the template's localized defaults
 */
export function autofillFromTemplate(
  template: Template, 
  locale: SupportedLanguage = 'en'
): AutofillResult {
  // Get localized content if available, fallback to defaults
  const localized = template.localized[locale];
  
  const result: AutofillResult = {
    title: localized?.defaults?.title || template.defaults.title,
    prompt: localized?.defaults?.prompt || template.defaults.prompt,
  };
  
  // Include params if they exist in the template
  if (template.defaults.params) {
    result.params = { ...template.defaults.params };
  }
  
  return result;
}

/**
 * Validate that a template has all required fields for autofill
 */
export function isValidTemplateForAutofill(template: Template): boolean {
  // Check required fields exist
  if (!template.id || !template.defaults) {
    return false;
  }
  
  // Check that defaults have required fields
  if (!template.defaults.title || !template.defaults.prompt) {
    return false;
  }
  
  // Check localized content structure if present
  for (const [locale, localizedContent] of Object.entries(template.localized)) {
    if (localizedContent && localizedContent.defaults) {
      if (!localizedContent.defaults.title || !localizedContent.defaults.prompt) {
        return false;
      }
    }
  }
  
  return true;
}