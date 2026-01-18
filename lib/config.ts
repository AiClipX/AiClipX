// Environment configuration
export interface AppConfig {
  apiBaseUrl: string;
  environment: 'local' | 'staging' | 'prod';
  isDevelopment: boolean;
  isProduction: boolean;
}

// Get environment based on API base URL and NODE_ENV
function getEnvironment(): 'local' | 'staging' | 'prod' {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  
  if (process.env.NODE_ENV === 'development' || apiBase.includes('localhost')) {
    return 'local';
  }
  
  if (apiBase.includes('aiclipx-iam2.onrender.com')) {
    return 'staging';
  }
  
  return 'prod';
}

// Centralized configuration
export const config: AppConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 
    (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://aiclipx-iam2.onrender.com'),
  environment: getEnvironment(),
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

// Safe logging - never log sensitive data
export const safeLog = (message: string, data?: any) => {
  if (config.isDevelopment) {
    console.log(`[${config.environment.toUpperCase()}] ${message}`, data);
  }
};

// Get display-safe API host (for UI display)
export const getApiHost = (): string => {
  try {
    const url = new URL(config.apiBaseUrl);
    return url.host;
  } catch {
    return config.apiBaseUrl;
  }
};