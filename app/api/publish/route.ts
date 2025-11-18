/**
 * Publishing API Endpoint
 *
 * POST /api/publish
 *
 * Publishes an article to one or more platforms.
 * Handles platform-specific transformations and tracks publication status.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  Platform,
  Article,
  PublishResult,
  Publication,
  PlatformPublishStatus,
  ArticleStatus,
} from '@/types';
import {
  createPlatformAdapter,
  getPlatformInfo,
} from '@/lib/adapters';
import { getDatabaseService } from '@/lib/appwrite/database';
import { hashContent } from '@/lib/utils';
import { applyRateLimit } from '@/lib/security/rate-limiter';
import { publishRequestSchema } from '@/lib/validation/schemas';
import { PlatformErrorHandler } from '@/lib/api/platform-error-handler';
import { APIError, ErrorCategory } from '@/lib/api/error-handler';

/**
 * Publish request body
 */
interface PublishRequest {
  articleId: string;
  userId: string;
  platforms: Platform[];
  useVariants?: boolean; // Use pre-generated variants or original content
}

/**
 * Publish response
 */
interface PublishResponse {
  success: boolean;
  results: PublishResult[];
  articleId: string;
  status: ArticleStatus;
}

/**
 * POST /api/publish
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting (5 requests per minute)
    const rateLimitResponse = applyRateLimit(request, 'publish');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parse request body
    const body: PublishRequest = await request.json();

    // Validate request with Zod schema
    const validation = publishRequestSchema.safeParse({
      articleId: body.articleId,
      platforms: body.platforms,
    });

    if (!validation.success) {
      const errors = validation.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return NextResponse.json(
        {
          error: 'Validation failed',
          details: errors,
        },
        { status: 400 }
      );
    }

    const { articleId, userId, platforms, useVariants = true } = body;

    // Validate userId
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    // Get article from database
    const db = getDatabaseService();
    const article = await db.getArticle(articleId);

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Verify ownership
    if (article.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update article status to publishing
    await db.updateArticle(articleId, {
      status: ArticleStatus.PUBLISHING,
    });

    // Get platform configurations for user
    const platformConfigs = await db.getPlatformConfigs(userId);
    const configMap = new Map(
      platformConfigs.map((config) => [config.platform, config])
    );

    // Publish to each platform
    const results: PublishResult[] = [];

    for (const platform of platforms) {
      try {
        const result = await publishToPlatform(
          article,
          platform,
          configMap.get(platform),
          useVariants
        );

        results.push(result);

        // Save publication record to database
        const publication: Publication = {
          platform,
          status: result.success
            ? result.isDraft
              ? PlatformPublishStatus.PENDING
              : PlatformPublishStatus.PUBLISHED
            : PlatformPublishStatus.FAILED,
          publishedUrl: result.url,
          publishedAt: result.success ? new Date().toISOString() : undefined,
          lastSyncedAt: new Date().toISOString(),
          contentHash: await hashContent(article.contentOriginal),
          error: result.error,
          retryCount: 0,
        };

        await db.upsertPublication(articleId, publication);
      } catch (error) {
        console.error(`Failed to publish to ${platform}:`, error);

        // Handle platform-specific errors
        let errorMessage = 'Unknown error';
        let userMessage = 'An error occurred while publishing';

        if (error instanceof APIError) {
          errorMessage = error.message;
          userMessage = error.userMessage;
        } else if (error instanceof Error) {
          errorMessage = error.message;
          userMessage = error.message;
        }

        results.push({
          platform,
          success: false,
          error: userMessage,
        });

        // Save failure record with retry count
        const existingPublications = await db.getPublications(articleId);
        const existingPublication = existingPublications.find(
          (p) => p.platform === platform
        );

        const publication: Publication = {
          platform,
          status: PlatformPublishStatus.FAILED,
          error: errorMessage,
          retryCount: (existingPublication?.retryCount || 0) + 1,
        };

        await db.upsertPublication(articleId, publication);
      }
    }

    // Determine overall status
    const allSucceeded = results.every((r) => r.success);
    const someSucceeded = results.some((r) => r.success);

    const finalStatus = allSucceeded
      ? ArticleStatus.PUBLISHED
      : someSucceeded
      ? ArticleStatus.PARTIALLY_PUBLISHED
      : ArticleStatus.FAILED;

    // Update article status
    await db.updateArticle(articleId, {
      status: finalStatus,
    });

    // Return response
    const response: PublishResponse = {
      success: someSucceeded,
      results,
      articleId,
      status: finalStatus,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Publish error:', error);

    // Handle API errors
    if (error instanceof APIError) {
      return NextResponse.json(
        {
          error: error.userMessage,
          category: error.category,
        },
        { status: error.statusCode || 500 }
      );
    }

    // Handle generic errors
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Publishing failed',
        category: ErrorCategory.UNKNOWN,
      },
      { status: 500 }
    );
  }
}

/**
 * Publish to a specific platform
 */
async function publishToPlatform(
  article: Article,
  platform: Platform,
  config: any,
  useVariants: boolean
): Promise<PublishResult> {
  // Check if platform config exists
  if (!config || !config.isValid) {
    throw new Error(
      `Platform ${platform} not configured or credentials invalid`
    );
  }

  // Get content for this platform
  const content = useVariants && article.contentVariants[platform]
    ? article.contentVariants[platform].content
    : article.contentOriginal;

  // Create article object with platform-specific content
  const articleToPublish: Article = {
    ...article,
    contentOriginal: content,
  };

  // Create platform adapter
  const adapter = createPlatformAdapter(platform, config.credentials);

  // Validate credentials
  const credentialsValid = await adapter.validateCredentials();
  if (!credentialsValid) {
    throw new Error(`Invalid credentials for ${platform}`);
  }

  // Publish
  const result = await adapter.publish(articleToPublish);

  return result;
}

/**
 * GET /api/publish/status/:articleId
 *
 * Get publication status for an article
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');

    if (!articleId) {
      return NextResponse.json(
        { error: 'Missing articleId parameter' },
        { status: 400 }
      );
    }

    const db = getDatabaseService();
    const publications = await db.getPublications(articleId);

    return NextResponse.json({ publications });
  } catch (error) {
    console.error('Status check error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Status check failed',
      },
      { status: 500 }
    );
  }
}
