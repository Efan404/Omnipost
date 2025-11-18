/**
 * Abstract base class for platform adapters
 *
 * This class defines the interface that all platform integrations must implement.
 * It provides common functionality and enforces a consistent API across platforms.
 */

import {
  Platform,
  PlatformCapabilities,
  PlatformCredentials,
  Article,
  PublishResult,
  DraftResult,
  UpdateResult,
  PlatformStatus,
  Result,
} from '@/types';

/**
 * Error types for platform operations
 */
export class PlatformError extends Error {
  constructor(
    message: string,
    public code: string,
    public platform: Platform,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'PlatformError';
  }
}

export class AuthenticationError extends PlatformError {
  constructor(platform: Platform, message: string = 'Authentication failed') {
    super(message, 'AUTH_ERROR', platform, false);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends PlatformError {
  constructor(
    platform: Platform,
    public retryAfter?: number,
    message: string = 'Rate limit exceeded'
  ) {
    super(message, 'RATE_LIMIT', platform, true);
    this.name = 'RateLimitError';
  }
}

export class ValidationError extends PlatformError {
  constructor(platform: Platform, message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', platform, false);
    this.name = 'ValidationError';
  }
}

/**
 * Abstract base class for all platform adapters
 */
export abstract class PlatformAdapter {
  /**
   * Platform identifier
   */
  abstract readonly platform: Platform;

  /**
   * Platform name for display
   */
  abstract readonly name: string;

  /**
   * Platform capabilities and constraints
   */
  abstract readonly capabilities: PlatformCapabilities;

  /**
   * Platform credentials
   */
  protected credentials: PlatformCredentials;

  /**
   * Constructor
   */
  constructor(credentials: PlatformCredentials) {
    this.credentials = credentials;
  }

  // ============================================================================
  // Abstract Methods - Must be implemented by subclasses
  // ============================================================================

  /**
   * Validate platform credentials
   * @returns Promise<boolean> - true if credentials are valid
   */
  abstract validateCredentials(): Promise<boolean>;

  /**
   * Transform content for platform-specific requirements
   * This method handles:
   * - Markdown formatting adjustments
   * - Image URL transformations
   * - Code block formatting
   * - Content length constraints
   *
   * @param content - Original markdown content
   * @param metadata - Article metadata
   * @returns Promise<string> - Transformed content
   */
  abstract transformContent(
    content: string,
    metadata: Article['metadata']
  ): Promise<string>;

  /**
   * Publish article to the platform
   * @param article - Article to publish
   * @returns Promise<PublishResult> - Publication result
   */
  abstract publish(article: Article): Promise<PublishResult>;

  /**
   * Get publication status for an article
   * @param articleId - Platform-specific article ID
   * @returns Promise<PlatformStatus> - Current status
   */
  abstract getPublishStatus(articleId: string): Promise<PlatformStatus>;

  // ============================================================================
  // Optional Methods - Can be overridden by subclasses
  // ============================================================================

  /**
   * Create a draft (if platform supports it)
   * @param article - Article to create as draft
   * @returns Promise<DraftResult> - Draft creation result
   */
  async createDraft(article: Article): Promise<DraftResult> {
    throw new Error(
      `Platform ${this.platform} does not support draft creation`
    );
  }

  /**
   * Update existing article (if platform supports it)
   * @param articleId - Platform-specific article ID
   * @param article - Updated article data
   * @returns Promise<UpdateResult> - Update result
   */
  async update(articleId: string, article: Article): Promise<UpdateResult> {
    throw new Error(`Platform ${this.platform} does not support updates`);
  }

  /**
   * Delete article (if platform supports it)
   * @param articleId - Platform-specific article ID
   * @returns Promise<boolean> - true if deleted successfully
   */
  async delete(articleId: string): Promise<boolean> {
    throw new Error(`Platform ${this.platform} does not support deletion`);
  }

  // ============================================================================
  // Common Helper Methods
  // ============================================================================

  /**
   * Validate article metadata against platform constraints
   * @param metadata - Article metadata
   * @throws ValidationError if validation fails
   */
  protected validateMetadata(metadata: Article['metadata']): void {
    const { title, tags } = metadata;
    const { maxTitleLength, supportsTags, maxTags } = this.capabilities;

    // Validate title length
    if (title.length > maxTitleLength) {
      throw new ValidationError(
        this.platform,
        `Title exceeds maximum length of ${maxTitleLength} characters`,
        'title'
      );
    }

    // Validate tags
    if (tags && tags.length > 0) {
      if (!supportsTags) {
        throw new ValidationError(
          this.platform,
          'This platform does not support tags',
          'tags'
        );
      }

      if (maxTags && tags.length > maxTags) {
        throw new ValidationError(
          this.platform,
          `Maximum ${maxTags} tags allowed`,
          'tags'
        );
      }
    }
  }

  /**
   * Validate content length
   * @param content - Article content
   * @throws ValidationError if validation fails
   */
  protected validateContentLength(content: string): void {
    const { maxContentLength } = this.capabilities;

    if (maxContentLength && content.length > maxContentLength) {
      throw new ValidationError(
        this.platform,
        `Content exceeds maximum length of ${maxContentLength} characters`,
        'content'
      );
    }
  }

  /**
   * Retry logic with exponential backoff
   * @param fn - Function to retry
   * @param maxRetries - Maximum number of retries
   * @param initialDelay - Initial delay in milliseconds
   * @returns Promise<T> - Result of the function
   */
  protected async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Don't retry if error is not retryable
        if (error instanceof PlatformError && !error.retryable) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = initialDelay * Math.pow(2, attempt);

        // If rate limited, use the retry-after value
        if (error instanceof RateLimitError && error.retryAfter) {
          await this.sleep(error.retryAfter * 1000);
        } else {
          await this.sleep(delay);
        }
      }
    }

    throw lastError!;
  }

  /**
   * Sleep utility
   * @param ms - Milliseconds to sleep
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create a Result type response
   */
  protected success<T>(data: T): Result<T> {
    return { success: true, data };
  }

  protected failure<E extends Error>(error: E): Result<never, E> {
    return { success: false, error };
  }

  /**
   * Log platform operations (can be overridden for custom logging)
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      platform: this.platform,
      level,
      message,
      ...(data && { data }),
    };

    // In production, this should integrate with a proper logging service
    console[level === 'info' ? 'log' : level](JSON.stringify(logData, null, 2));
  }
}
