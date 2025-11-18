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
    // Parse request body
    const body: PublishRequest = await request.json();
    const { articleId, userId, platforms, useVariants = true } = body;

    // Validate inputs
    if (!articleId || !userId || !platforms || platforms.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: articleId, userId, platforms' },
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

        results.push({
          platform,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Save failure record
        const publication: Publication = {
          platform,
          status: PlatformPublishStatus.FAILED,
          error: error instanceof Error ? error.message : 'Unknown error',
          retryCount: 0,
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

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Publishing failed',
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
