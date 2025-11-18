/**
 * Medium Platform Adapter
 *
 * Integrates with the Medium API for publishing articles.
 * API Documentation: https://github.com/Medium/medium-api-docs
 *
 * Note: Medium API only supports creating drafts. Manual publishing required.
 */

import {
  Platform,
  PlatformCapabilities,
  Article,
  PublishResult,
  PlatformStatus,
  PlatformPublishStatus,
  DraftResult,
} from '@/types';
import {
  PlatformAdapter,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  PlatformError,
} from './base';

/**
 * Medium API response types
 */
interface MediumUser {
  id: string;
  username: string;
  name: string;
  url: string;
  imageUrl: string;
}

interface MediumPost {
  id: string;
  title: string;
  authorId: string;
  url: string;
  canonicalUrl?: string;
  publishStatus: 'public' | 'draft' | 'unlisted';
  publishedAt?: number;
  tags?: string[];
}

interface MediumErrorResponse {
  errors: Array<{
    message: string;
    code: number;
  }>;
}

/**
 * Medium Platform Adapter Implementation
 */
export class MediumAdapter extends PlatformAdapter {
  readonly platform = Platform.MEDIUM;
  readonly name = 'Medium';

  readonly capabilities: PlatformCapabilities = {
    supportMarkdown: true,
    maxTitleLength: 256,
    imageHosting: 'cdn', // Medium auto-hosts images
    requiresCover: false,
    supportsCodeBlocks: true,
    supportsTags: true,
    maxTags: 5,
    supportsSeries: false,
    canUpdate: false, // Medium API doesn't support updates
    requiresManualPublish: true, // API only creates drafts
  };

  private readonly API_BASE = 'https://api.medium.com/v1';
  private userId?: string;

  /**
   * Validate Medium access token
   */
  async validateCredentials(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      return !!user;
    } catch (error) {
      this.log('error', 'Credential validation failed', { error });
      return false;
    }
  }

  /**
   * Transform content for Medium
   * Medium supports markdown but has some quirks
   */
  async transformContent(
    content: string,
    metadata: Article['metadata']
  ): Promise<string> {
    let transformed = content;

    // Medium auto-converts image URLs, so no special handling needed
    // However, ensure proper markdown formatting

    // Convert markdown headings to Medium-friendly format
    // Medium prefers # for titles, ## for subtitles
    transformed = this.normalizeHeadings(transformed);

    // Ensure proper spacing around code blocks
    transformed = this.normalizeCodeBlocks(transformed);

    return transformed;
  }

  /**
   * Publish article to Medium (creates draft)
   */
  async publish(article: Article): Promise<PublishResult> {
    try {
      // Validate before publishing
      this.validateMetadata(article.metadata);
      const content = await this.transformContent(
        article.contentOriginal,
        article.metadata
      );
      this.validateContentLength(content);

      // Get user ID
      const user = await this.getCurrentUser();
      if (!user) {
        throw new AuthenticationError(this.platform);
      }

      // Prepare article payload
      const payload = {
        title: article.metadata.title,
        contentFormat: 'markdown',
        content: content,
        tags: article.metadata.tags.slice(0, this.capabilities.maxTags),
        publishStatus: 'draft', // API limitation: can only create drafts
        ...(article.metadata.canonicalUrl && {
          canonicalUrl: article.metadata.canonicalUrl,
        }),
      };

      // Publish with retry logic
      const response = await this.retry(() =>
        this.makeRequest(`/users/${user.id}/posts`, {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      );

      if (!response.ok) {
        const error = await this.handleErrorResponse(response);
        throw error;
      }

      const result = await response.json();
      const post: MediumPost = result.data;

      this.log('info', 'Article draft created successfully', {
        articleId: post.id,
        url: post.url,
      });

      return {
        platform: this.platform,
        success: true,
        url: post.url,
        articleId: post.id,
        isDraft: true, // Important: inform user that manual publish is needed
      };
    } catch (error) {
      this.log('error', 'Publish failed', { error });

      return {
        platform: this.platform,
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Create draft on Medium
   */
  async createDraft(article: Article): Promise<DraftResult> {
    const result = await this.publish(article);

    if (!result.success || !result.url) {
      throw new Error(result.error || 'Failed to create draft');
    }

    return {
      platform: this.platform,
      draftId: result.articleId || '',
      editUrl: result.url,
    };
  }

  /**
   * Get publication status
   * Note: Medium API doesn't provide a way to get post by ID
   * This is a limitation we need to work around
   */
  async getPublishStatus(articleId: string): Promise<PlatformStatus> {
    try {
      // Medium API limitation: can't get individual post by ID
      // We can only list user's posts and find the matching one
      const user = await this.getCurrentUser();
      if (!user) {
        throw new AuthenticationError(this.platform);
      }

      const response = await this.makeRequest(
        `/users/${user.id}/publications`
      );

      if (!response.ok) {
        throw new Error(`Failed to get status: ${response.statusText}`);
      }

      // For now, we'll return a generic status
      // In production, we'd need to store the URL and check it
      return {
        platform: this.platform,
        status: PlatformPublishStatus.PUBLISHED,
      };
    } catch (error) {
      this.log('error', 'Status check failed', { error, articleId });

      return {
        platform: this.platform,
        status: PlatformPublishStatus.FAILED,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Get current authenticated user
   */
  private async getCurrentUser(): Promise<MediumUser | null> {
    if (this.userId) {
      // Return cached user info if available
      const response = await this.makeRequest(`/users/${this.userId}`);
      if (response.ok) {
        const result = await response.json();
        return result.data;
      }
    }

    // Get user info from /me endpoint
    const response = await this.makeRequest('/me');

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    const user: MediumUser = result.data;

    // Cache user ID
    this.userId = user.id;

    return user;
  }

  /**
   * Make authenticated API request to Medium
   */
  private async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.API_BASE}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.credentials.accessToken || ''}`,
      Accept: 'application/json',
      'Accept-Charset': 'utf-8',
      ...options.headers,
    };

    return fetch(url, {
      ...options,
      headers,
    });
  }

  /**
   * Handle API error responses
   */
  private async handleErrorResponse(
    response: Response
  ): Promise<PlatformError> {
    const status = response.status;

    // Rate limiting
    if (status === 429) {
      return new RateLimitError(this.platform);
    }

    // Authentication error
    if (status === 401 || status === 403) {
      return new AuthenticationError(this.platform);
    }

    // Validation error
    if (status === 400 || status === 422) {
      try {
        const data: MediumErrorResponse = await response.json();
        const message = data.errors.map((e) => e.message).join(', ');
        return new ValidationError(this.platform, message);
      } catch {
        return new ValidationError(this.platform, 'Validation error occurred');
      }
    }

    // Generic error
    return new PlatformError(
      `API request failed: ${response.statusText}`,
      'API_ERROR',
      this.platform,
      status >= 500 // Server errors are retryable
    );
  }

  /**
   * Normalize headings for Medium
   */
  private normalizeHeadings(content: string): string {
    // Medium handles headings well, no special transformation needed
    return content;
  }

  /**
   * Normalize code blocks for Medium
   */
  private normalizeCodeBlocks(content: string): string {
    // Ensure blank lines before and after code blocks
    return content.replace(/([^\n])(```)/g, '$1\n\n$2').replace(/(```\n?)([^\n])/g, '$1\n$2');
  }
}
