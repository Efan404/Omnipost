/**
 * Platform-Specific Error Handlers
 *
 * Handles platform-specific errors and edge cases for Dev.to, Medium, and other platforms.
 */

import { Platform } from '@/types';
import { APIError, ErrorCategory } from './error-handler';

/**
 * Platform-specific error codes
 */
export enum DevToErrorCode {
  RATE_LIMIT = 429,
  UNAUTHORIZED = 401,
  INVALID_API_KEY = 403,
  ARTICLE_NOT_FOUND = 404,
  VALIDATION_ERROR = 422,
}

export enum MediumErrorCode {
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  TOKEN_EXPIRED = 401,
  INVALID_SCOPE = 403,
}

/**
 * Platform-specific error messages
 */
export interface PlatformErrorDetails {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  retryAfter?: number; // in seconds
  action?: string; // suggested action
}

/**
 * Dev.to Error Handler
 *
 * Handles Dev.to-specific errors including rate limiting, authentication, and validation.
 */
export class DevToErrorHandler {
  /**
   * Parse Dev.to API error response
   */
  static parseError(statusCode: number, responseData: unknown): PlatformErrorDetails {
    // Rate limiting (429)
    if (statusCode === DevToErrorCode.RATE_LIMIT) {
      // Dev.to rate limit: 30 requests per 30 seconds
      return {
        code: 'DEVTO_RATE_LIMIT',
        message: 'Dev.to rate limit exceeded',
        userMessage:
          'Dev.to rate limit exceeded. Please wait 60 seconds and try again. (Limit: 30 requests per 30 seconds)',
        retryable: true,
        retryAfter: 60,
        action: 'Wait and retry',
      };
    }

    // Invalid API key (401/403)
    if (statusCode === DevToErrorCode.UNAUTHORIZED || statusCode === DevToErrorCode.INVALID_API_KEY) {
      return {
        code: 'DEVTO_AUTH_ERROR',
        message: 'Dev.to API key is invalid or expired',
        userMessage: 'Your Dev.to API key is invalid. Please update it in platform settings.',
        retryable: false,
        action: 'Update API key',
      };
    }

    // Article not found (404)
    if (statusCode === DevToErrorCode.ARTICLE_NOT_FOUND) {
      return {
        code: 'DEVTO_NOT_FOUND',
        message: 'Article not found on Dev.to',
        userMessage: 'The article was not found on Dev.to. It may have been deleted.',
        retryable: false,
        action: 'Check article status',
      };
    }

    // Validation error (422)
    if (statusCode === DevToErrorCode.VALIDATION_ERROR) {
      const errorMessage = this.extractErrorMessage(responseData);
      return {
        code: 'DEVTO_VALIDATION_ERROR',
        message: `Dev.to validation error: ${errorMessage}`,
        userMessage: `Dev.to rejected your article: ${errorMessage}`,
        retryable: false,
        action: 'Fix validation errors',
      };
    }

    // Generic error
    return {
      code: 'DEVTO_UNKNOWN_ERROR',
      message: `Dev.to error: ${statusCode}`,
      userMessage: 'An error occurred while publishing to Dev.to. Please try again.',
      retryable: true,
      action: 'Try again',
    };
  }

  /**
   * Extract error message from response
   */
  private static extractErrorMessage(responseData: unknown): string {
    if (typeof responseData === 'object' && responseData !== null) {
      if ('error' in responseData && typeof responseData.error === 'string') {
        return responseData.error;
      }
      if ('message' in responseData && typeof responseData.message === 'string') {
        return responseData.message;
      }
      if ('errors' in responseData && Array.isArray(responseData.errors)) {
        return responseData.errors.join(', ');
      }
    }
    return 'Unknown error';
  }

  /**
   * Handle Dev.to error and return user-friendly message
   */
  static handleError(statusCode: number, responseData: unknown): APIError {
    const details = this.parseError(statusCode, responseData);

    const category =
      statusCode === 429
        ? ErrorCategory.RATE_LIMIT
        : statusCode === 401 || statusCode === 403
        ? ErrorCategory.AUTHENTICATION
        : statusCode === 422
        ? ErrorCategory.VALIDATION
        : ErrorCategory.UNKNOWN;

    const error = new APIError(details.message, category, statusCode, responseData, details.retryable);
    error.userMessage = details.userMessage;

    return error;
  }
}

/**
 * Medium Error Handler
 *
 * Handles Medium-specific errors including OAuth, draft limitations, and authentication.
 */
export class MediumErrorHandler {
  /**
   * Parse Medium API error response
   */
  static parseError(statusCode: number, responseData: unknown): PlatformErrorDetails {
    // Unauthorized (401) - Token expired or invalid
    if (statusCode === MediumErrorCode.UNAUTHORIZED) {
      return {
        code: 'MEDIUM_TOKEN_EXPIRED',
        message: 'Medium access token is invalid or expired',
        userMessage:
          'Your Medium access token has expired. Please re-authenticate with Medium in platform settings.',
        retryable: false,
        action: 'Re-authenticate with Medium',
      };
    }

    // Forbidden (403) - Invalid scope or permissions
    if (statusCode === MediumErrorCode.FORBIDDEN) {
      return {
        code: 'MEDIUM_FORBIDDEN',
        message: 'Medium API access forbidden',
        userMessage:
          'You do not have permission to publish to Medium. Please check your OAuth scopes and re-authenticate.',
        retryable: false,
        action: 'Check OAuth permissions',
      };
    }

    // Not found (404)
    if (statusCode === MediumErrorCode.NOT_FOUND) {
      return {
        code: 'MEDIUM_NOT_FOUND',
        message: 'Medium resource not found',
        userMessage: 'The requested resource was not found on Medium.',
        retryable: false,
        action: 'Check resource ID',
      };
    }

    // Generic error
    return {
      code: 'MEDIUM_UNKNOWN_ERROR',
      message: `Medium error: ${statusCode}`,
      userMessage: 'An error occurred while publishing to Medium. Please try again.',
      retryable: true,
      action: 'Try again',
    };
  }

  /**
   * Handle Medium error and return user-friendly message
   */
  static handleError(statusCode: number, responseData: unknown): APIError {
    const details = this.parseError(statusCode, responseData);

    const category =
      statusCode === 401 || statusCode === 403
        ? ErrorCategory.AUTHENTICATION
        : ErrorCategory.UNKNOWN;

    const error = new APIError(details.message, category, statusCode, responseData, details.retryable);
    error.userMessage = details.userMessage;

    return error;
  }

  /**
   * Show draft limitation message
   *
   * Medium API only supports creating drafts, not published posts.
   * This helper generates a user-friendly message with manual publish instructions.
   */
  static getDraftLimitationMessage(articleUrl?: string): string {
    const baseMessage =
      'Medium API only supports creating drafts. Your article has been saved as a draft on Medium.';

    if (articleUrl) {
      return `${baseMessage}\n\nTo publish, visit: ${articleUrl}`;
    }

    return `${baseMessage}\n\nPlease visit Medium.com to publish your draft manually.`;
  }
}

/**
 * Generic platform error handler
 *
 * Routes errors to platform-specific handlers.
 */
export class PlatformErrorHandler {
  /**
   * Handle error for specific platform
   */
  static handleError(platform: Platform, statusCode: number, responseData: unknown): APIError {
    switch (platform) {
      case Platform.DEVTO:
        return DevToErrorHandler.handleError(statusCode, responseData);

      case Platform.MEDIUM:
        return MediumErrorHandler.handleError(statusCode, responseData);

      // TODO: Add Juejin and Zhihu handlers in Phase 2
      case Platform.JUEJIN:
      case Platform.ZHIHU:
        return new APIError(
          `${platform} integration not yet implemented`,
          ErrorCategory.UNKNOWN,
          statusCode,
          responseData,
          false
        );

      default:
        return new APIError(
          `Unknown platform: ${platform}`,
          ErrorCategory.UNKNOWN,
          statusCode,
          responseData,
          false
        );
    }
  }

  /**
   * Check if error is retryable for platform
   */
  static isRetryable(platform: Platform, statusCode: number): boolean {
    switch (platform) {
      case Platform.DEVTO:
        // Retry rate limits and server errors
        return statusCode === 429 || statusCode >= 500;

      case Platform.MEDIUM:
        // Retry server errors only
        return statusCode >= 500;

      default:
        return false;
    }
  }

  /**
   * Get retry delay for platform (in milliseconds)
   */
  static getRetryDelay(platform: Platform, statusCode: number, attempt: number): number {
    if (platform === Platform.DEVTO && statusCode === 429) {
      // Dev.to rate limit: wait 60 seconds
      return 60000;
    }

    // Default exponential backoff: 2s, 4s, 8s
    return Math.min(1000 * Math.pow(2, attempt), 10000);
  }
}

/**
 * Format error for display to user
 */
export function formatPlatformError(platform: Platform, error: APIError): string {
  const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
  return `${platformName}: ${error.userMessage}`;
}

/**
 * Check if article exceeds platform limits
 */
export interface PlatformLimits {
  maxTitleLength: number;
  maxContentLength: number;
  maxTags: number;
  maxImageSize: number; // in bytes
  supportsHTML: boolean;
  supportsMarkdown: boolean;
}

export const PLATFORM_LIMITS: Record<Platform, PlatformLimits> = {
  [Platform.DEVTO]: {
    maxTitleLength: 200,
    maxContentLength: 1000000, // ~1MB
    maxTags: 4,
    maxImageSize: 10 * 1024 * 1024, // 10MB
    supportsHTML: false,
    supportsMarkdown: true,
  },
  [Platform.MEDIUM]: {
    maxTitleLength: 200,
    maxContentLength: 1000000,
    maxTags: 5,
    maxImageSize: 10 * 1024 * 1024,
    supportsHTML: true,
    supportsMarkdown: false,
  },
  [Platform.JUEJIN]: {
    maxTitleLength: 100,
    maxContentLength: 500000,
    maxTags: 3,
    maxImageSize: 5 * 1024 * 1024,
    supportsHTML: false,
    supportsMarkdown: true,
  },
  [Platform.ZHIHU]: {
    maxTitleLength: 100,
    maxContentLength: 500000,
    maxTags: 5,
    maxImageSize: 5 * 1024 * 1024,
    supportsHTML: true,
    supportsMarkdown: false,
  },
};

/**
 * Validate content against platform limits
 */
export function validatePlatformLimits(
  platform: Platform,
  title: string,
  content: string,
  tags: string[]
): { valid: boolean; errors: string[] } {
  const limits = PLATFORM_LIMITS[platform];
  const errors: string[] = [];

  if (title.length > limits.maxTitleLength) {
    errors.push(`Title exceeds ${limits.maxTitleLength} characters (${title.length})`);
  }

  if (content.length > limits.maxContentLength) {
    errors.push(`Content exceeds ${limits.maxContentLength} characters (${content.length})`);
  }

  if (tags.length > limits.maxTags) {
    errors.push(`Too many tags (${tags.length}/${limits.maxTags})`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
