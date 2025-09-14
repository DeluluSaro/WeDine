/**
 * Environment detection utilities for WeDine RFID System
 * Handles both local development and Vercel deployment
 */

export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';

/**
 * Get the base URL for API calls
 * Automatically detects if running locally or on Vercel
 */
export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use current origin
    return window.location.origin;
  }
  
  if (process.env.VERCEL_URL) {
    // Vercel deployment
    return `https://${process.env.VERCEL_URL}`;
  }
  
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    // Vercel deployment with public URL
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  
  // Local development
  return 'http://localhost:3000';
}

/**
 * Get the RFID API endpoint URL
 */
export function getRfidApiUrl(): string {
  return `${getBaseUrl()}/api/rfid`;
}

/**
 * Get the fast payment API endpoint URL
 */
export function getFastPaymentApiUrl(): string {
  return `${getBaseUrl()}/api/rfid/fast-payment`;
}

/**
 * Get the card detection API endpoint URL
 */
export function getCardDetectionApiUrl(): string {
  return `${getBaseUrl()}/api/rfid/card-detected`;
}

/**
 * Environment configuration
 */
export const environment = {
  isDevelopment,
  isProduction,
  baseUrl: getBaseUrl(),
  rfidApiUrl: getRfidApiUrl(),
  fastPaymentApiUrl: getFastPaymentApiUrl(),
  cardDetectionApiUrl: getCardDetectionApiUrl(),
  
  // Debug settings
  enableDebug: isDevelopment,
  enableConsoleLogs: isDevelopment,
  
  // Feature flags
  enableRfidSimulation: isDevelopment,
  enableTestMode: isDevelopment,
} as const;

/**
 * Log function that only works in development
 */
export function debugLog(message: string, ...args: any[]): void {
  if (environment.enableDebug) {
    console.log(`[WeDine Debug] ${message}`, ...args);
  }
}

/**
 * Get environment info for debugging
 */
export function getEnvironmentInfo() {
  return {
    nodeEnv: process.env.NODE_ENV,
    vercelUrl: process.env.VERCEL_URL,
    publicVercelUrl: process.env.NEXT_PUBLIC_VERCEL_URL,
    baseUrl: getBaseUrl(),
    isDevelopment,
    isProduction,
  };
}
