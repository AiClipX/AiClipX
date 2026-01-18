// Environment validation utilities
export interface EnvValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required environment variables
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  
  if (!apiBaseUrl) {
    errors.push('NEXT_PUBLIC_API_BASE_URL is required');
  } else {
    // Validate URL format
    try {
      new URL(apiBaseUrl);
    } catch {
      errors.push('NEXT_PUBLIC_API_BASE_URL must be a valid URL');
    }
    
    // Check for common mistakes
    if (apiBaseUrl.endsWith('/')) {
      warnings.push('NEXT_PUBLIC_API_BASE_URL should not end with a slash');
    }
    
    if (apiBaseUrl.includes('localhost') && process.env.NODE_ENV === 'production') {
      warnings.push('Using localhost API URL in production environment');
    }
  }

  // Check mock auth setting
  const mockAuth = process.env.NEXT_PUBLIC_MOCK_AUTH;
  if (mockAuth === 'true' && process.env.NODE_ENV === 'production') {
    warnings.push('NEXT_PUBLIC_MOCK_AUTH is enabled in production');
  }

  // Check Supabase config consistency
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if ((supabaseUrl && !supabaseKey) || (!supabaseUrl && supabaseKey)) {
    warnings.push('Supabase configuration is incomplete (both URL and key required)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// Development-only environment info display
export function logEnvironmentInfo() {
  if (process.env.NODE_ENV !== 'development') return;
  
  const validation = validateEnvironment();
  
  console.group('🌍 Environment Configuration');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('API Base URL:', process.env.NEXT_PUBLIC_API_BASE_URL);
  console.log('Mock Auth:', process.env.NEXT_PUBLIC_MOCK_AUTH || 'false');
  
  if (validation.warnings.length > 0) {
    console.group('⚠️ Warnings');
    validation.warnings.forEach(warning => console.warn(warning));
    console.groupEnd();
  }
  
  if (validation.errors.length > 0) {
    console.group('❌ Errors');
    validation.errors.forEach(error => console.error(error));
    console.groupEnd();
  }
  
  console.groupEnd();
}