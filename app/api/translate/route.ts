/**
 * Translation API Endpoint
 *
 * POST /api/translate
 *
 * Implements dual-AI translation workflow:
 * 1. Translator AI translates the content
 * 2. Reviewer AI checks quality and provides feedback
 * 3. Returns translation with quality score and review report
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  TranslationRequest,
  TranslationResponse,
  TranslationReviewReport,
} from '@/types';
import {
  createAIProvider,
  AIProvider,
  BaseAIProvider,
} from '@/lib/ai/providers';

/**
 * Rate limiting (simple in-memory implementation)
 * In production, use Redis or similar
 */
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const requests = rateLimitMap.get(identifier) || [];

  // Remove old requests outside the window
  const recentRequests = requests.filter((time) => now - time < RATE_LIMIT_WINDOW);

  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  recentRequests.push(now);
  rateLimitMap.set(identifier, recentRequests);

  return true;
}

/**
 * Get AI provider for translation
 * Prefers DeepSeek (cost-effective) > OpenAI > Anthropic
 */
function getTranslationProvider(): BaseAIProvider | null {
  // Try DeepSeek first (cost-effective for translation)
  if (process.env.DEEPSEEK_API_KEY) {
    return createAIProvider(AIProvider.DEEPSEEK, {
      apiKey: process.env.DEEPSEEK_API_KEY,
    });
  }

  // Fallback to OpenAI
  if (process.env.OPENAI_API_KEY) {
    return createAIProvider(AIProvider.OPENAI, {
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  // Last fallback to Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    return createAIProvider(AIProvider.ANTHROPIC, {
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  return null;
}

/**
 * Get AI provider for review
 * Prefers Anthropic (better at analysis) > OpenAI > DeepSeek
 */
function getReviewProvider(): BaseAIProvider | null {
  // Try Anthropic first (better at quality review and analysis)
  if (process.env.ANTHROPIC_API_KEY) {
    return createAIProvider(AIProvider.ANTHROPIC, {
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  // Fallback to OpenAI
  if (process.env.OPENAI_API_KEY) {
    return createAIProvider(AIProvider.OPENAI, {
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  // Last fallback to DeepSeek
  if (process.env.DEEPSEEK_API_KEY) {
    return createAIProvider(AIProvider.DEEPSEEK, {
      apiKey: process.env.DEEPSEEK_API_KEY,
    });
  }

  return null;
}

/**
 * POST /api/translate
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body: TranslationRequest = await request.json();
    const { content, sourceLang, targetLang, domain, context } = body;

    // Validate inputs
    if (!content || !sourceLang || !targetLang) {
      return NextResponse.json(
        { error: 'Missing required fields: content, sourceLang, targetLang' },
        { status: 400 }
      );
    }

    if (content.length > 50000) {
      return NextResponse.json(
        { error: 'Content too long. Maximum 50,000 characters.' },
        { status: 400 }
      );
    }

    // Step 1: Translate content
    const translatedContent = await translateWithAI(
      content,
      sourceLang,
      targetLang,
      domain,
      context
    );

    // Step 2: Review translation
    const reviewReport = await reviewTranslation(
      content,
      translatedContent,
      sourceLang,
      targetLang
    );

    // Step 3: Determine status based on quality score
    const status =
      reviewReport.overallScore >= 0.9 ? 'auto_approved' : 'pending_human_review';

    // Generate response
    const response: TranslationResponse = {
      translationId: generateTranslationId(),
      translatedContent,
      reviewReport,
      status,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Translation error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Translation failed',
      },
      { status: 500 }
    );
  }
}

/**
 * Translate content using AI (Translator AI)
 */
async function translateWithAI(
  content: string,
  sourceLang: string,
  targetLang: string,
  domain?: string,
  context?: string
): Promise<string> {
  const provider = getTranslationProvider();

  if (!provider) {
    throw new Error('No AI provider configured for translation. Please set OPENAI_API_KEY, ANTHROPIC_API_KEY, or DEEPSEEK_API_KEY.');
  }

  const prompt = buildTranslationPrompt(
    content,
    sourceLang,
    targetLang,
    domain,
    context
  );

  const systemPrompt = 'You are a professional translator specializing in technical content. Translate accurately while preserving markdown formatting, code blocks, and technical terminology.';

  try {
    const response = await provider.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3, // Lower temperature for more accurate translation
      maxTokens: 4000,
    });

    return response.content.trim();
  } catch (error) {
    throw new Error(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Review translation using AI (Reviewer AI)
 */
async function reviewTranslation(
  originalContent: string,
  translatedContent: string,
  sourceLang: string,
  targetLang: string
): Promise<TranslationReviewReport> {
  const provider = getReviewProvider();

  if (!provider) {
    throw new Error('No AI provider configured for review. Please set ANTHROPIC_API_KEY, OPENAI_API_KEY, or DEEPSEEK_API_KEY.');
  }

  const prompt = buildReviewPrompt(
    originalContent,
    translatedContent,
    sourceLang,
    targetLang
  );

  const systemPrompt = 'You are a translation quality reviewer. Analyze translations objectively and provide detailed feedback.';

  try {
    const response = await provider.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      maxTokens: 2000,
    });

    // Parse review response into structured report
    return parseReviewResponse(response.content.trim());
  } catch (error) {
    throw new Error(`Review failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Build translation prompt
 */
function buildTranslationPrompt(
  content: string,
  sourceLang: string,
  targetLang: string,
  domain?: string,
  context?: string
): string {
  return `Translate the following ${domain || 'technical'} content from ${sourceLang} to ${targetLang}.

${context ? `**Context:** ${context}\n\n` : ''}**Important Instructions:**
1. Preserve all markdown formatting
2. Keep code blocks unchanged
3. Maintain technical terminology accuracy
4. Ensure natural flow in target language
5. DO NOT add any explanations or notes
6. Return ONLY the translated content

**Content to translate:**

${content}

**Translation:**`;
}

/**
 * Build review prompt
 */
function buildReviewPrompt(
  original: string,
  translation: string,
  sourceLang: string,
  targetLang: string
): string {
  return `Review this translation and provide a quality assessment.

**Original (${sourceLang}):**
${original}

**Translation (${targetLang}):**
${translation}

**Provide your review in the following JSON format:**
{
  "accuracyScore": <0.0-1.0>,
  "fluencyScore": <0.0-1.0>,
  "terminologyScore": <0.0-1.0>,
  "suggestions": ["suggestion1", "suggestion2"],
  "issues": [
    {
      "type": "accuracy|fluency|terminology",
      "severity": "low|medium|high",
      "description": "description of the issue"
    }
  ]
}

**Scoring criteria:**
- Accuracy: Does the translation convey the same meaning?
- Fluency: Does it read naturally in the target language?
- Terminology: Are technical terms translated correctly?

Return ONLY the JSON, no additional text.`;
}

/**
 * Parse AI review response into structured report
 */
function parseReviewResponse(reviewText: string): TranslationReviewReport {
  try {
    // Try to extract JSON from the response
    const jsonMatch = reviewText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON found in review response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Calculate overall score (weighted average)
    const overallScore =
      parsed.accuracyScore * 0.4 +
      parsed.fluencyScore * 0.3 +
      parsed.terminologyScore * 0.3;

    return {
      accuracyScore: parsed.accuracyScore,
      fluencyScore: parsed.fluencyScore,
      terminologyScore: parsed.terminologyScore,
      overallScore: Math.round(overallScore * 100) / 100,
      suggestions: parsed.suggestions || [],
      issues: parsed.issues || [],
    };
  } catch (error) {
    console.error('Failed to parse review response:', error);

    // Fallback to default scores
    return {
      accuracyScore: 0.8,
      fluencyScore: 0.8,
      terminologyScore: 0.8,
      overallScore: 0.8,
      suggestions: ['Unable to parse detailed review. Manual review recommended.'],
      issues: [],
    };
  }
}

/**
 * Generate unique translation ID
 */
function generateTranslationId(): string {
  return `trans_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}
