/**
 * Abstract AI Provider Base Class
 *
 * Defines the interface for all AI providers (OpenAI, Claude, DeepSeek, etc.)
 */

export enum AIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  DEEPSEEK = 'deepseek',
}

export enum AIModel {
  // OpenAI Models
  GPT4O = 'gpt-4o',
  GPT4O_MINI = 'gpt-4o-mini',
  GPT4_TURBO = 'gpt-4-turbo-preview',
  GPT35_TURBO = 'gpt-3.5-turbo',

  // Anthropic Models
  CLAUDE_OPUS = 'claude-3-opus-20240229',
  CLAUDE_SONNET = 'claude-3-5-sonnet-20241022',
  CLAUDE_HAIKU = 'claude-3-5-haiku-20241022',

  // DeepSeek Models
  DEEPSEEK_CHAT = 'deepseek-chat',
  DEEPSEEK_CODER = 'deepseek-coder',
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionRequest {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface AICompletionResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIProviderConfig {
  apiKey: string;
  model?: string;
  baseURL?: string;
}

/**
 * Abstract base class for AI providers
 */
export abstract class BaseAIProvider {
  protected config: AIProviderConfig;

  abstract readonly provider: AIProvider;
  abstract readonly defaultModel: AIModel;
  abstract readonly supportedModels: AIModel[];

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  /**
   * Generate a completion from the AI
   */
  abstract complete(request: AICompletionRequest): Promise<AICompletionResponse>;

  /**
   * Validate API key
   */
  abstract validateApiKey(): Promise<boolean>;

  /**
   * Get provider name for display
   */
  abstract getProviderName(): string;

  /**
   * Check if a model is supported
   */
  isModelSupported(model: AIModel): boolean {
    return this.supportedModels.includes(model);
  }

  /**
   * Get default model
   */
  getDefaultModel(): string {
    return this.config.model || this.defaultModel;
  }

  /**
   * Build messages array
   */
  protected buildMessages(
    systemPrompt: string,
    userPrompt: string
  ): AIMessage[] {
    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
  }
}
