/**
 * OpenAI Provider Implementation
 *
 * Integrates with OpenAI's GPT models for content generation and translation.
 */

import {
  BaseAIProvider,
  AIProvider,
  AIModel,
  AICompletionRequest,
  AICompletionResponse,
  AIProviderConfig,
} from './base';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAICompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface OpenAICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI Provider
 */
export class OpenAIProvider extends BaseAIProvider {
  readonly provider = AIProvider.OPENAI;
  readonly defaultModel = AIModel.GPT4O_MINI;
  readonly supportedModels = [
    AIModel.GPT4O,
    AIModel.GPT4O_MINI,
    AIModel.GPT4_TURBO,
    AIModel.GPT35_TURBO,
  ];

  private readonly baseURL: string;

  constructor(config: AIProviderConfig) {
    super(config);
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';
  }

  /**
   * Generate completion using OpenAI API
   */
  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const model = request.model || this.getDefaultModel();

    const payload: OpenAICompletionRequest = {
      model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 4000,
    };

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data: OpenAICompletionResponse = await response.json();

    return {
      content: data.choices[0].message.content,
      model: data.model,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
    };
  }

  /**
   * Validate OpenAI API key
   */
  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('OpenAI API key validation failed:', error);
      return false;
    }
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'OpenAI';
  }
}
