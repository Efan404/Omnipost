/**
 * API Error Handler with Retry Logic
 *
 * Provides comprehensive error handling for API calls with:
 * - Error categorization (Network, Auth, Validation, Server)
 * - Exponential backoff retry mechanism
 * - User-friendly error messages
 * - Toast notifications integration
 */

/**
 * Error categories for better error handling
 */
export enum ErrorCategory {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Structured API error
 */
export class APIError extends Error {
  category: ErrorCategory;
  statusCode?: number;
  originalError?: unknown;
  userMessage: string;
  retryable: boolean;

  constructor(
    message: string,
    category: ErrorCategory,
    statusCode?: number,
    originalError?: unknown,
    retryable = false
  ) {
    super(message);
    this.name = 'APIError';
    this.category = category;
    this.statusCode = statusCode;
    this.originalError = originalError;
    this.retryable = retryable;
    this.userMessage = this.getUserFriendlyMessage();
  }

  private getUserFriendlyMessage(): string {
    switch (this.category) {
      case ErrorCategory.NETWORK:
        return 'Network connection failed. Please check your internet connection and try again.';
      case ErrorCategory.AUTHENTICATION:
        return 'Authentication failed. Please log in again.';
      case ErrorCategory.VALIDATION:
        return this.message || 'Invalid input. Please check your data and try again.';
      case ErrorCategory.RATE_LIMIT:
        return 'Too many requests. Please wait a moment and try again.';
      case ErrorCategory.SERVER:
        return 'Server error occurred. Our team has been notified. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Categorize error based on response or error type
 */
export function categorizeError(error: unknown, statusCode?: number): ErrorCategory {
  if (statusCode) {
    if (statusCode === 401 || statusCode === 403) {
      return ErrorCategory.AUTHENTICATION;
    }
    if (statusCode === 400 || statusCode === 422) {
      return ErrorCategory.VALIDATION;
    }
    if (statusCode === 429) {
      return ErrorCategory.RATE_LIMIT;
    }
    if (statusCode >= 500) {
      return ErrorCategory.SERVER;
    }
  }

  if (error instanceof TypeError && error.message.includes('fetch')) {
    return ErrorCategory.NETWORK;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('network') || message.includes('timeout')) {
      return ErrorCategory.NETWORK;
    }
    if (message.includes('auth') || message.includes('unauthorized')) {
      return ErrorCategory.AUTHENTICATION;
    }
    if (message.includes('rate limit')) {
      return ErrorCategory.RATE_LIMIT;
    }
  }

  return ErrorCategory.UNKNOWN;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(category: ErrorCategory, statusCode?: number): boolean {
  // Retry network errors and server errors
  if (category === ErrorCategory.NETWORK || category === ErrorCategory.SERVER) {
    return true;
  }

  // Retry rate limit errors
  if (category === ErrorCategory.RATE_LIMIT) {
    return true;
  }

  // Retry specific 5xx errors
  if (statusCode && statusCode >= 500 && statusCode !== 501) {
    return true;
  }

  // Retry 408 (Request Timeout) and 429 (Too Many Requests)
  if (statusCode === 408 || statusCode === 429) {
    return true;
  }

  return false;
}

/**
 * Calculate delay for exponential backoff
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with retry logic and error handling
 *
 * @example
 * ```ts
 * const data = await fetchWithRetry('/api/publish', {
 *   method: 'POST',
 *   body: JSON.stringify({ content: '...' }),
 * });
 * ```
 */
export async function fetchWithRetry<T = unknown>(
  url: string,
  options: RequestInit = {},
  retryConfig: Partial<RetryConfig> = {}
): Promise<T> {
  const config: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  let lastError: APIError | null = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      // Add default headers
      const headers = new Headers(options.headers);
      if (!headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json');
      }

      // Make request
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Parse response
      let data: unknown;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Handle error responses
      if (!response.ok) {
        const category = categorizeError(null, response.status);
        const errorMessage =
          typeof data === 'object' && data && 'error' in data
            ? String((data as { error: string }).error)
            : `Request failed with status ${response.status}`;

        const error = new APIError(
          errorMessage,
          category,
          response.status,
          data,
          isRetryableError(category, response.status)
        );

        // Check if we should retry
        if (error.retryable && attempt < config.maxAttempts) {
          const delay = calculateDelay(attempt, config);
          console.warn(
            `Request failed (attempt ${attempt}/${config.maxAttempts}). Retrying in ${delay}ms...`,
            error
          );
          await sleep(delay);
          lastError = error;
          continue;
        }

        throw error;
      }

      // Success
      return data as T;
    } catch (error) {
      // Network error or other exception
      const category = categorizeError(error);
      const apiError = new APIError(
        error instanceof Error ? error.message : 'Unknown error',
        category,
        undefined,
        error,
        isRetryableError(category)
      );

      // Check if we should retry
      if (apiError.retryable && attempt < config.maxAttempts) {
        const delay = calculateDelay(attempt, config);
        console.warn(
          `Request failed (attempt ${attempt}/${config.maxAttempts}). Retrying in ${delay}ms...`,
          apiError
        );
        await sleep(delay);
        lastError = apiError;
        continue;
      }

      // Don't retry
      throw apiError;
    }
  }

  // All retries exhausted
  throw lastError || new APIError('Request failed after all retries', ErrorCategory.UNKNOWN);
}

/**
 * Wrapper for GET requests
 */
export async function apiGet<T = unknown>(
  url: string,
  retryConfig?: Partial<RetryConfig>
): Promise<T> {
  return fetchWithRetry<T>(url, { method: 'GET' }, retryConfig);
}

/**
 * Wrapper for POST requests
 */
export async function apiPost<T = unknown>(
  url: string,
  body: unknown,
  retryConfig?: Partial<RetryConfig>
): Promise<T> {
  return fetchWithRetry<T>(
    url,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
    retryConfig
  );
}

/**
 * Wrapper for PUT requests
 */
export async function apiPut<T = unknown>(
  url: string,
  body: unknown,
  retryConfig?: Partial<RetryConfig>
): Promise<T> {
  return fetchWithRetry<T>(
    url,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    },
    retryConfig
  );
}

/**
 * Wrapper for DELETE requests
 */
export async function apiDelete<T = unknown>(
  url: string,
  retryConfig?: Partial<RetryConfig>
): Promise<T> {
  return fetchWithRetry<T>(url, { method: 'DELETE' }, retryConfig);
}

/**
 * Handle API errors and show toast notifications
 * This should be called in try-catch blocks
 *
 * @example
 * ```ts
 * try {
 *   await apiPost('/api/publish', data);
 * } catch (error) {
 *   handleAPIError(error, toast);
 * }
 * ```
 */
export function handleAPIError(error: unknown, toast?: (message: string) => void): void {
  console.error('API Error:', error);

  if (error instanceof APIError) {
    // Show user-friendly message
    if (toast) {
      toast(error.userMessage);
    } else {
      console.error(error.userMessage);
    }

    // Log to monitoring service
    logErrorToMonitoring(error);
  } else if (error instanceof Error) {
    const message = 'An unexpected error occurred. Please try again.';
    if (toast) {
      toast(message);
    } else {
      console.error(message);
    }

    logErrorToMonitoring(error);
  }
}

/**
 * Log error to monitoring service (e.g., Sentry)
 */
function logErrorToMonitoring(error: Error): void {
  // TODO: Integrate with Sentry or similar
  // Example:
  // Sentry.captureException(error);

  const errorData = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A',
  };

  console.error('Error logged to monitoring:', errorData);
}
