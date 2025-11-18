/**
 * AI Providers Registry
 *
 * Central registry for all AI providers.
 * Provides factory methods to create provider instances.
 */

import { BaseAIProvider, AIProvider, AIProviderConfig } from './base';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { DeepSeekProvider } from './deepseek';

/**
 * Provider information for UI display
 */
export interface ProviderInfo {
  id: AIProvider;
  name: string;
  description: string;
  icon: string;
  isAvailable: boolean;
  requiresApiKey: boolean;
  websiteUrl: string;
}

/**
 * Registry of all AI providers
 */
export const PROVIDER_INFO: Record<AIProvider, ProviderInfo> = {
  [AIProvider.OPENAI]: {
    id: AIProvider.OPENAI,
    name: 'OpenAI',
    description: 'GPT-4, GPT-4o, and GPT-3.5 models',
    icon: '🤖',
    isAvailable: true,
    requiresApiKey: true,
    websiteUrl: 'https://platform.openai.com',
  },
  [AIProvider.ANTHROPIC]: {
    id: AIProvider.ANTHROPIC,
    name: 'Anthropic Claude',
    description: 'Claude 3 Opus, Sonnet, and Haiku',
    icon: '🧠',
    isAvailable: true,
    requiresApiKey: true,
    websiteUrl: 'https://console.anthropic.com',
  },
  [AIProvider.DEEPSEEK]: {
    id: AIProvider.DEEPSEEK,
    name: 'DeepSeek',
    description: 'DeepSeek Chat and Coder models',
    icon: '🔮',
    isAvailable: true,
    requiresApiKey: true,
    websiteUrl: 'https://platform.deepseek.com',
  },
};

/**
 * Get provider information
 */
export function getProviderInfo(provider: AIProvider): ProviderInfo {
  return PROVIDER_INFO[provider];
}

/**
 * Get all available providers
 */
export function getAvailableProviders(): ProviderInfo[] {
  return Object.values(PROVIDER_INFO).filter((p) => p.isAvailable);
}

/**
 * Create AI provider instance
 */
export function createAIProvider(
  provider: AIProvider,
  config: AIProviderConfig
): BaseAIProvider {
  switch (provider) {
    case AIProvider.OPENAI:
      return new OpenAIProvider(config);

    case AIProvider.ANTHROPIC:
      return new AnthropicProvider(config);

    case AIProvider.DEEPSEEK:
      return new DeepSeekProvider(config);

    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

/**
 * Validate API key for a provider
 */
export async function validateProviderApiKey(
  provider: AIProvider,
  apiKey: string
): Promise<boolean> {
  try {
    const aiProvider = createAIProvider(provider, { apiKey });
    return await aiProvider.validateApiKey();
  } catch (error) {
    console.error('Failed to validate API key:', error);
    return false;
  }
}

// Re-export types and classes
export * from './base';
export { OpenAIProvider } from './openai';
export { AnthropicProvider } from './anthropic';
export { DeepSeekProvider } from './deepseek';
