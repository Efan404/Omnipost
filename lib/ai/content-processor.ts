/**
 * AI Content Processor
 *
 * Processes content using AI to generate platform-specific variants.
 * Supports multiple AI providers: OpenAI, Anthropic Claude, DeepSeek.
 */

import {
  Platform,
  ContentProcessInput,
  PlatformVariants,
  Article,
} from '@/types';
import { getPlatformInfo } from '@/lib/adapters';
import { getPlatformMarkupParser } from '@/lib/parser/platform-markup';
import {
  createAIProvider,
  AIProvider,
  AIModel,
  BaseAIProvider,
} from './providers';

/**
 * AI Configuration for content processing
 */
interface AIConfig {
  provider: AIProvider;
  model?: string;
  apiKey?: string;
}

/**
 * Content processing result
 */
interface ProcessingResult {
  variants: PlatformVariants;
  processingTime: number;
  model: string;
  provider: string;
}

/**
 * AI Content Processor Class
 */
export class ContentProcessor {
  private aiProvider: BaseAIProvider;
  private config: AIConfig;

  constructor(config?: Partial<AIConfig>) {
    // Default to OpenAI if not specified
    const provider = config?.provider || AIProvider.OPENAI;

    // Get API key from environment or config
    const apiKey = config?.apiKey || this.getProviderApiKey(provider);

    if (!apiKey) {
      console.warn(`Warning: No API key configured for ${provider}. AI processing may fail.`);
    }

    this.config = {
      provider,
      model: config?.model,
      apiKey,
    };

    // Create AI provider instance
    this.aiProvider = createAIProvider(provider, {
      apiKey: apiKey || '',
      model: config?.model,
    });
  }

  /**
   * Get API key from environment variables
   */
  private getProviderApiKey(provider: AIProvider): string | undefined {
    switch (provider) {
      case AIProvider.OPENAI:
        return process.env.OPENAI_API_KEY;
      case AIProvider.ANTHROPIC:
        return process.env.ANTHROPIC_API_KEY;
      case AIProvider.DEEPSEEK:
        return process.env.DEEPSEEK_API_KEY;
      default:
        return undefined;
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
      model: this.aiProvider.getDefaultModel(),
      provider: this.aiProvider.getProviderName(),
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
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildOptimizationPrompt(
      content,
      platform,
      platformInfo,
      metadata
    );

    // Call AI API
    try {
      const response = await this.aiProvider.complete({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        maxTokens: 4000,
      });

      return response.content.trim();
    } catch (error) {
      console.error(`Failed to optimize for ${platform}:`, error);
      // Fallback to original content if AI fails
      return content;
    }
  }

  /**
   * Build system prompt for AI
   */
  private buildSystemPrompt(): string {
    return 'You are a professional content editor and technical writer. You optimize articles for different publishing platforms while maintaining accuracy and value. You understand the nuances of each platform\'s audience and formatting requirements.';
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

  /**
   * Get current AI provider info
   */
  getProviderInfo(): { provider: string; model: string } {
    return {
      provider: this.aiProvider.getProviderName(),
      model: this.aiProvider.getDefaultModel(),
    };
  }
}

/**
 * Singleton instance
 */
let processorInstance: ContentProcessor | null = null;

export function getContentProcessor(config?: Partial<AIConfig>): ContentProcessor {
  if (!processorInstance || config) {
    processorInstance = new ContentProcessor(config);
  }
  return processorInstance;
}

/**
 * Convenience function to process content with specific provider
 */
export async function processArticleContent(
  article: Article,
  platforms: Platform[],
  provider?: AIProvider,
  model?: string
): Promise<ProcessingResult> {
  const processor = getContentProcessor({ provider, model });

  return processor.processContent({
    originalMarkdown: article.contentOriginal,
    metadata: article.metadata,
    platforms,
  });
}
