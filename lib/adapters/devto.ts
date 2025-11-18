/**
 * Dev.to Platform Adapter
 *
 * Integrates with the Dev.to API for publishing technical articles.
 * API Documentation: https://developers.forem.com/api/v1
 */

import {
  Platform,
  PlatformCapabilities,
  Article,
  PublishResult,
  UpdateResult,
  PlatformStatus,
  PlatformPublishStatus,
} from '@/types';
import {
  PlatformAdapter,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  PlatformError,
} from './base';

/**
 * Dev.to API response types
 */
interface DevToArticleResponse {
  id: number;
  title: string;
  url: string;
  published: boolean;
  published_at?: string;
}

interface DevToErrorResponse {
  error: string;
  status: number;
}

/**
 * Dev.to Platform Adapter Implementation
 */
export class DevToAdapter extends PlatformAdapter {
  readonly platform = Platform.DEV_TO;
  readonly name = 'Dev.to';

  readonly capabilities: PlatformCapabilities = {
    supportMarkdown: true,
    maxTitleLength: 128,
    imageHosting: 'external',
    requiresCover: false,
    supportsCodeBlocks: true,
    supportsTags: true,
    maxTags: 4,
    supportsSeries: true,
    canUpdate: true,
    requiresManualPublish: false,
  };

  private readonly API_BASE = 'https://dev.to/api';
  private readonly API_VERSION = 'v1';

  /**
   * Validate Dev.to API key
   */
  async validateCredentials(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/articles/me/unpublished', {
        method: 'GET',
      });

      return response.ok;
    } catch (error) {
      this.log('error', 'Credential validation failed', { error });
      return false;
    }
  }

  /**
   * Transform content for Dev.to
   * Dev.to has excellent markdown support, so minimal transformation needed
   */
  async transformContent(
    content: string,
    metadata: Article['metadata']
  ): Promise<string> {
    let transformed = content;

    // Add front matter if canonical URL is provided
    if (metadata.canonicalUrl) {
      const frontMatter = `---\ncanonical_url: ${metadata.canonicalUrl}\n---\n\n`;
      transformed = frontMatter + transformed;
    }

    // Ensure code blocks have language specified for syntax highlighting
    transformed = this.enhanceCodeBlocks(transformed);

    return transformed;
  }

  /**
   * Publish article to Dev.to
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

      // Prepare article payload
      const payload = {
        article: {
          title: article.metadata.title,
          body_markdown: content,
          published: true,
          tags: article.metadata.tags.slice(0, this.capabilities.maxTags),
          ...(article.metadata.series && { series: article.metadata.series }),
          ...(article.metadata.coverImage && {
            main_image: article.metadata.coverImage,
          }),
          ...(article.metadata.canonicalUrl && {
            canonical_url: article.metadata.canonicalUrl,
          }),
        },
      };

      // Publish with retry logic
      const response = await this.retry(() =>
        this.makeRequest('/articles', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      );

      if (!response.ok) {
        const error = await this.handleErrorResponse(response);
        throw error;
      }

      const data: DevToArticleResponse = await response.json();

      this.log('info', 'Article published successfully', {
        articleId: data.id,
        url: data.url,
      });

      return {
        platform: this.platform,
        success: true,
        url: data.url,
        articleId: data.id.toString(),
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
   * Update existing article on Dev.to
   */
  async update(articleId: string, article: Article): Promise<UpdateResult> {
    try {
      this.validateMetadata(article.metadata);
      const content = await this.transformContent(
        article.contentOriginal,
        article.metadata
      );

      const payload = {
        article: {
          title: article.metadata.title,
          body_markdown: content,
          tags: article.metadata.tags.slice(0, this.capabilities.maxTags),
          ...(article.metadata.series && { series: article.metadata.series }),
          ...(article.metadata.coverImage && {
            main_image: article.metadata.coverImage,
          }),
        },
      };

      const response = await this.retry(() =>
        this.makeRequest(`/articles/${articleId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      );

      if (!response.ok) {
        const error = await this.handleErrorResponse(response);
        throw error;
      }

      const data: DevToArticleResponse = await response.json();

      this.log('info', 'Article updated successfully', { articleId, url: data.url });

      return {
        platform: this.platform,
        success: true,
        url: data.url,
      };
    } catch (error) {
      this.log('error', 'Update failed', { error, articleId });

      return {
        platform: this.platform,
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get publication status
   */
  async getPublishStatus(articleId: string): Promise<PlatformStatus> {
    try {
      const response = await this.makeRequest(`/articles/${articleId}`);

      if (!response.ok) {
        if (response.status === 404) {
          return {
            platform: this.platform,
            status: PlatformPublishStatus.NOT_PUBLISHED,
          };
        }
        throw new Error(`Failed to get status: ${response.statusText}`);
      }

      const data: DevToArticleResponse = await response.json();

      return {
        platform: this.platform,
        status: data.published
          ? PlatformPublishStatus.PUBLISHED
          : PlatformPublishStatus.PENDING,
        url: data.url,
        publishedAt: data.published_at,
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
   * Make authenticated API request to Dev.to
   */
  private async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.API_BASE}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      'api-key': this.credentials.apiKey || '',
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
  private async handleErrorResponse(response: Response): Promise<PlatformError> {
    const status = response.status;

    // Rate limiting
    if (status === 429) {
      const retryAfter = response.headers.get('retry-after');
      return new RateLimitError(
        this.platform,
        retryAfter ? parseInt(retryAfter) : undefined
      );
    }

    // Authentication error
    if (status === 401 || status === 403) {
      return new AuthenticationError(this.platform);
    }

    // Validation error
    if (status === 422) {
      try {
        const data: DevToErrorResponse = await response.json();
        return new ValidationError(this.platform, data.error);
      } catch {
        return new ValidationError(
          this.platform,
          'Validation error occurred'
        );
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
   * Enhance code blocks with language tags
   */
  private enhanceCodeBlocks(content: string): string {
    // Find code blocks without language specification and default to 'text'
    return content.replace(/```\n/g, '```text\n');
  }
}
