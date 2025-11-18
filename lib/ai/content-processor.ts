/**
 * AI Content Processor
 *
 * Processes content using AI to generate platform-specific variants.
 * Uses OpenAI GPT-4 or Anthropic Claude for intelligent content adaptation.
 */

import {
  Platform,
  ContentProcessInput,
  ProcessedContent,
  PlatformVariants,
  ContentVariant,
  Article,
} from '@/types';
import { getPlatformInfo } from '@/lib/adapters';
import { getPlatformMarkupParser } from '@/lib/parser/platform-markup';

/**
 * AI Provider types
 */
export type AIProvider = 'openai' | 'anthropic';

/**
 * AI Configuration
 */
interface AIConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
}

/**
 * Content processing result
 */
interface ProcessingResult {
  variants: PlatformVariants;
  processingTime: number;
  model: string;
}

/**
 * AI Content Processor Class
 */
export class ContentProcessor {
  private config: AIConfig;

  constructor(config?: Partial<AIConfig>) {
    const defaultProvider: AIProvider = 'openai';
    const defaultModel = 'gpt-4o-mini';

    this.config = {
      provider: config?.provider || defaultProvider,
      model: config?.model || defaultModel,
      apiKey:
        config?.apiKey ||
        (defaultProvider === 'openai'
          ? process.env.OPENAI_API_KEY
          : process.env.ANTHROPIC_API_KEY) ||
        '',
    };

    if (!this.config.apiKey) {
      console.warn('Warning: No AI API key configured. AI processing will fail.');
    }
  }

  /**
   * Process content and generate platform variants
   */
  async processContent(input: ContentProcessInput): Promise<ProcessingResult> {
    const startTime = Date.now();

    // First, parse platform markup to get base variants
    const parser = getPlatformMarkupParser();
    const baseVariants = parser.generateVariants(
      input.originalMarkdown,
      input.platforms
    );

    // Then, use AI to optimize each variant for its platform
    const optimizedVariants: PlatformVariants = {};

    for (const platform of input.platforms) {
      const baseContent = baseVariants[platform]?.content || input.originalMarkdown;

      const optimized = await this.optimizeForPlatform(
        baseContent,
        platform,
        input.metadata
      );

      optimizedVariants[platform] = {
        content: optimized,
        lastModified: new Date().toISOString(),
        isCustomized: false,
      };
    }

    const processingTime = Date.now() - startTime;

    return {
      variants: optimizedVariants,
      processingTime,
      model: this.config.model,
    };
  }

  /**
   * Optimize content for a specific platform using AI
   */
  private async optimizeForPlatform(
    content: string,
    platform: Platform,
    metadata: Article['metadata']
  ): Promise<string> {
    const platformInfo = getPlatformInfo(platform);

    // Build optimization prompt
    const prompt = this.buildOptimizationPrompt(
      content,
      platform,
      platformInfo,
      metadata
    );

    // Call AI API
    try {
      const optimized = await this.callAI(prompt);
      return optimized;
    } catch (error) {
      console.error(`Failed to optimize for ${platform}:`, error);
      // Fallback to original content if AI fails
      return content;
    }
  }

  /**
   * Build optimization prompt for AI
   */
  private buildOptimizationPrompt(
    content: string,
    platform: Platform,
    platformInfo: any,
    metadata: Article['metadata']
  ): string {
    const platformGuidelines = this.getPlatformGuidelines(platform);

    return `You are a content optimization expert. Your task is to adapt the following article content for publishing on ${platformInfo.name}.

**Original Content:**
${content}

**Article Metadata:**
- Title: ${metadata.title}
- Tags: ${metadata.tags.join(', ')}
${metadata.category ? `- Category: ${metadata.category}` : ''}

**Platform Guidelines for ${platformInfo.name}:**
${platformGuidelines}

**Instructions:**
1. Preserve the core message and technical accuracy
2. Adapt the tone and style for ${platformInfo.name}'s audience
3. Optimize formatting for best readability on this platform
4. Ensure markdown syntax is compatible
5. Keep all code blocks intact
6. Maintain SEO value
7. DO NOT add introductory phrases like "Here's the optimized version"
8. Return ONLY the optimized content, nothing else

**Optimized Content:**`;
  }

  /**
   * Get platform-specific content guidelines
   */
  private getPlatformGuidelines(platform: Platform): string {
    const guidelines: Record<Platform, string> = {
      [Platform.DEV_TO]: `
- Dev.to audience loves technical depth and code examples
- Use clear headings (##, ###) for structure
- Code blocks with language tags are essential
- Personal experience and storytelling work well
- Be conversational but technical
- Include practical examples and demos
- Encourage discussion in the conclusion
      `,
      [Platform.MEDIUM]: `
- Medium readers prefer narrative-driven content
- Use shorter paragraphs for better readability
- Subheadings should be compelling
- Limit code blocks (Medium's formatting is limited)
- Focus on the "why" and "what" more than the "how"
- Strong opening hook is crucial
- Use pull quotes for emphasis
- More casual, essay-like tone
      `,
      [Platform.JUEJIN]: `
- Juejin audience is primarily Chinese developers
- Technical depth is highly valued
- Step-by-step tutorials work well
- Use Chinese technical terminology where appropriate
- Code examples should be well-commented
- Include practical use cases
- Problem-solution format is popular
      `,
      [Platform.ZHIHU]: `
- Zhihu audience expects authoritative, well-researched content
- Academic or analytical tone works well
- Cite sources and references
- Use data and statistics
- Longer, comprehensive articles perform better
- Question-answer format is native to the platform
      `,
      [Platform.SSPAI]: `
- SSPAI readers appreciate practical, actionable advice
- Focus on productivity and efficiency
- Clean, minimalist writing style
- Screenshots and visuals are important
- Tool recommendations and comparisons work well
      `,
    };

    return guidelines[platform] || 'Optimize for general technical audience.';
  }

  /**
   * Call AI API (OpenAI or Anthropic)
   */
  private async callAI(prompt: string): Promise<string> {
    if (this.config.provider === 'openai') {
      return this.callOpenAI(prompt);
    } else {
      return this.callAnthropic(prompt);
    }
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content:
              'You are a professional content editor and technical writer. You optimize articles for different publishing platforms while maintaining accuracy and value.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  }

  /**
   * Call Anthropic Claude API
   */
  private async callAnthropic(prompt: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${error}`);
    }

    const data = await response.json();
    return data.content[0].text.trim();
  }

  /**
   * Simple content optimization without AI (fallback)
   * Uses platform markup parser only
   */
  simpleProcess(
    content: string,
    platforms: Platform[]
  ): PlatformVariants {
    const parser = getPlatformMarkupParser();
    return parser.generateVariants(content, platforms);
  }
}

/**
 * Singleton instance
 */
let processorInstance: ContentProcessor | null = null;

export function getContentProcessor(config?: Partial<AIConfig>): ContentProcessor {
  if (!processorInstance) {
    processorInstance = new ContentProcessor(config);
  }
  return processorInstance;
}

/**
 * Convenience function to process content
 */
export async function processArticleContent(
  article: Article,
  platforms: Platform[]
): Promise<ProcessingResult> {
  const processor = getContentProcessor();

  return processor.processContent({
    originalMarkdown: article.contentOriginal,
    metadata: article.metadata,
    platforms,
  });
}
