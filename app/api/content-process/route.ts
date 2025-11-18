/**
 * Content Processing API Endpoint
 *
 * POST /api/content-process
 *
 * Processes article content to generate platform-specific variants using AI.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  Platform,
  Article,
  PlatformVariants,
} from '@/types';
import { getContentProcessor } from '@/lib/ai/content-processor';
import { getDatabaseService } from '@/lib/appwrite/database';

/**
 * Content process request
 */
interface ContentProcessRequest {
  articleId: string;
  userId: string;
  platforms: Platform[];
  useAI?: boolean; // Use AI optimization or just platform markup parser
}

/**
 * POST /api/content-process
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: ContentProcessRequest = await request.json();
    const { articleId, userId, platforms, useAI = true } = body;

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

    // Process content
    const processor = getContentProcessor();

    let variants: PlatformVariants;
    let processingTime: number;
    let model: string | undefined;

    if (useAI) {
      // Use AI optimization
      const result = await processor.processContent({
        originalMarkdown: article.contentOriginal,
        metadata: article.metadata,
        platforms,
      });

      variants = result.variants;
      processingTime = result.processingTime;
      model = result.model;
    } else {
      // Use simple platform markup parser only
      const startTime = Date.now();
      variants = processor.simpleProcess(article.contentOriginal, platforms);
      processingTime = Date.now() - startTime;
    }

    // Update article with variants
    await db.updateArticle(articleId, {
      contentVariants: variants,
    });

    // Return response
    return NextResponse.json({
      success: true,
      variants,
      processingTime,
      model,
    });
  } catch (error) {
    console.error('Content processing error:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Content processing failed',
      },
      { status: 500 }
    );
  }
}
