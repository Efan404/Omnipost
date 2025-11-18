/**
 * Platform Markup Parser
 *
 * Parses custom platform-specific markup syntax in markdown content.
 * Supports:
 * - [[platforms: dev.to, medium]] ... [[/platforms]]
 * - [[exclude: medium]] ... [[/exclude]]
 */

import { Platform, PlatformVariants, ContentVariant } from '@/types';

/**
 * Platform markup types
 */
export type MarkupType = 'include' | 'exclude';

/**
 * Parsed markup block
 */
export interface MarkupBlock {
  type: MarkupType;
  platforms: Platform[];
  content: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Parse result
 */
export interface ParseResult {
  commonContent: string;
  markupBlocks: MarkupBlock[];
  errors: ParseError[];
}

/**
 * Parse error
 */
export interface ParseError {
  message: string;
  line?: number;
  column?: number;
}

/**
 * Platform markup regex patterns
 */
const PLATFORM_MARKER_REGEX = /\[\[platforms?:\s*([^\]]+)\]\]([\s\S]*?)\[\[\/platforms?\]\]/gi;
const EXCLUDE_MARKER_REGEX = /\[\[exclude:\s*([^\]]+)\]\]([\s\S]*?)\[\[\/exclude\]\]/gi;

/**
 * Platform name mapping (for parsing)
 */
const PLATFORM_ALIASES: Record<string, Platform> = {
  'dev.to': Platform.DEV_TO,
  devto: Platform.DEV_TO,
  dev: Platform.DEV_TO,

  medium: Platform.MEDIUM,
  med: Platform.MEDIUM,

  juejin: Platform.JUEJIN,
  掘金: Platform.JUEJIN,

  zhihu: Platform.ZHIHU,
  知乎: Platform.ZHIHU,

  sspai: Platform.SSPAI,
  少数派: Platform.SSPAI,
};

/**
 * Platform Markup Parser Class
 */
export class PlatformMarkupParser {
  /**
   * Parse markdown content and extract platform-specific sections
   */
  parse(content: string): ParseResult {
    const errors: ParseError[] = [];
    const markupBlocks: MarkupBlock[] = [];

    // Parse include markers
    const includeBlocks = this.extractBlocks(
      content,
      PLATFORM_MARKER_REGEX,
      'include'
    );
    markupBlocks.push(...includeBlocks);

    // Parse exclude markers
    const excludeBlocks = this.extractBlocks(
      content,
      EXCLUDE_MARKER_REGEX,
      'exclude'
    );
    markupBlocks.push(...excludeBlocks);

    // Sort blocks by start index
    markupBlocks.sort((a, b) => a.startIndex - b.startIndex);

    // Extract common content (parts not in any markup block)
    const commonContent = this.extractCommonContent(content, markupBlocks);

    // Validate blocks
    const validationErrors = this.validateBlocks(markupBlocks);
    errors.push(...validationErrors);

    return {
      commonContent,
      markupBlocks,
      errors,
    };
  }

  /**
   * Generate platform-specific variants from parsed content
   */
  generateVariants(
    content: string,
    targetPlatforms: Platform[]
  ): PlatformVariants {
    const parseResult = this.parse(content);
    const variants: PlatformVariants = {};

    for (const platform of targetPlatforms) {
      variants[platform] = {
        content: this.buildPlatformContent(
          parseResult.commonContent,
          parseResult.markupBlocks,
          platform
        ),
        lastModified: new Date().toISOString(),
        isCustomized: false,
      };
    }

    return variants;
  }

  /**
   * Build content for a specific platform
   */
  private buildPlatformContent(
    commonContent: string,
    markupBlocks: MarkupBlock[],
    platform: Platform
  ): string {
    let platformContent = commonContent;

    for (const block of markupBlocks) {
      const shouldInclude = this.shouldIncludeBlock(block, platform);

      if (shouldInclude) {
        // Insert the block content at the appropriate position
        platformContent += '\n\n' + block.content.trim();
      }
    }

    return platformContent.trim();
  }

  /**
   * Determine if a block should be included for a platform
   */
  private shouldIncludeBlock(block: MarkupBlock, platform: Platform): boolean {
    if (block.type === 'include') {
      // Include only if platform is in the list
      return block.platforms.includes(platform);
    } else {
      // Exclude: include only if platform is NOT in the list
      return !block.platforms.includes(platform);
    }
  }

  /**
   * Extract markup blocks from content
   */
  private extractBlocks(
    content: string,
    regex: RegExp,
    type: MarkupType
  ): MarkupBlock[] {
    const blocks: MarkupBlock[] = [];
    let match: RegExpExecArray | null;

    // Reset regex lastIndex
    regex.lastIndex = 0;

    while ((match = regex.exec(content)) !== null) {
      const [fullMatch, platformsStr, blockContent] = match;
      const platforms = this.parsePlatformList(platformsStr);

      blocks.push({
        type,
        platforms,
        content: blockContent.trim(),
        startIndex: match.index,
        endIndex: match.index + fullMatch.length,
      });
    }

    return blocks;
  }

  /**
   * Parse comma-separated platform list
   */
  private parsePlatformList(platformsStr: string): Platform[] {
    const platforms: Platform[] = [];
    const parts = platformsStr.split(',').map((s) => s.trim().toLowerCase());

    for (const part of parts) {
      const platform = PLATFORM_ALIASES[part];
      if (platform) {
        platforms.push(platform);
      }
    }

    return platforms;
  }

  /**
   * Extract common content (parts not in any markup block)
   */
  private extractCommonContent(
    content: string,
    markupBlocks: MarkupBlock[]
  ): string {
    if (markupBlocks.length === 0) {
      return content;
    }

    let commonContent = '';
    let lastIndex = 0;

    for (const block of markupBlocks) {
      // Add content before this block
      if (block.startIndex > lastIndex) {
        commonContent += content.substring(lastIndex, block.startIndex);
      }
      lastIndex = block.endIndex;
    }

    // Add remaining content after last block
    if (lastIndex < content.length) {
      commonContent += content.substring(lastIndex);
    }

    // Clean up the markup tags from common content
    commonContent = this.removeMarkupTags(commonContent);

    return commonContent.trim();
  }

  /**
   * Remove markup tags from content
   */
  private removeMarkupTags(content: string): string {
    return content
      .replace(PLATFORM_MARKER_REGEX, '')
      .replace(EXCLUDE_MARKER_REGEX, '');
  }

  /**
   * Validate markup blocks for errors
   */
  private validateBlocks(blocks: MarkupBlock[]): ParseError[] {
    const errors: ParseError[] = [];

    for (const block of blocks) {
      // Check if platforms list is empty
      if (block.platforms.length === 0) {
        errors.push({
          message: `No valid platforms specified in ${block.type} block`,
        });
      }

      // Check if content is empty
      if (!block.content.trim()) {
        errors.push({
          message: `Empty content in ${block.type} block`,
        });
      }
    }

    // Check for overlapping blocks
    for (let i = 0; i < blocks.length - 1; i++) {
      const current = blocks[i];
      const next = blocks[i + 1];

      if (current.endIndex > next.startIndex) {
        errors.push({
          message: 'Overlapping markup blocks detected',
        });
      }
    }

    return errors;
  }

  /**
   * Strip all platform markup from content
   * Useful for preview or fallback scenarios
   */
  stripAllMarkup(content: string): string {
    return content
      .replace(PLATFORM_MARKER_REGEX, '$2')
      .replace(EXCLUDE_MARKER_REGEX, '');
  }

  /**
   * Validate markup syntax
   */
  validateMarkup(content: string): { valid: boolean; errors: ParseError[] } {
    const parseResult = this.parse(content);

    return {
      valid: parseResult.errors.length === 0,
      errors: parseResult.errors,
    };
  }
}

/**
 * Singleton instance
 */
let parserInstance: PlatformMarkupParser | null = null;

export function getPlatformMarkupParser(): PlatformMarkupParser {
  if (!parserInstance) {
    parserInstance = new PlatformMarkupParser();
  }
  return parserInstance;
}

/**
 * Convenience functions
 */

/**
 * Parse content and generate variants
 */
export function parseAndGenerateVariants(
  content: string,
  platforms: Platform[]
): PlatformVariants {
  const parser = getPlatformMarkupParser();
  return parser.generateVariants(content, platforms);
}

/**
 * Strip markup from content
 */
export function stripPlatformMarkup(content: string): string {
  const parser = getPlatformMarkupParser();
  return parser.stripAllMarkup(content);
}

/**
 * Validate markup syntax
 */
export function validatePlatformMarkup(content: string): {
  valid: boolean;
  errors: ParseError[];
} {
  const parser = getPlatformMarkupParser();
  return parser.validateMarkup(content);
}
