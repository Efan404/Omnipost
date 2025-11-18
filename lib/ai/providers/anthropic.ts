/**
 * Anthropic Claude Provider Implementation
 *
 * Integrates with Anthropic's Claude models for content generation and translation.
 */

import {
  BaseAIProvider,
  AIProvider,
  AIModel,
  AICompletionRequest,
  AICompletionResponse,
  AIProviderConfig,
  AIMessage,
} from './base';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicCompletionRequest {
  model: string;
  messages: AnthropicMessage[];
  max_tokens: number;
  temperature?: number;
  system?: string;
}

interface AnthropicCompletionResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Anthropic Claude Provider
 */
export class AnthropicProvider extends BaseAIProvider {
  readonly provider = AIProvider.ANTHROPIC;
  readonly defaultModel = AIModel.CLAUDE_SONNET;
  readonly supportedModels = [
    AIModel.CLAUDE_OPUS,
    AIModel.CLAUDE_SONNET,
    AIModel.CLAUDE_HAIKU,
  ];

  private readonly baseURL: string;

  constructor(config: AIProviderConfig) {
    super(config);
    this.baseURL = config.baseURL || 'https://api.anthropic.com/v1';
  }

  /**
   * Generate completion using Anthropic API
   */
  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const model = request.model || this.getDefaultModel();

    // Extract system message if present
    let systemPrompt = '';
    const messages: AnthropicMessage[] = [];

    for (const msg of request.messages) {
      if (msg.role === 'system') {
        systemPrompt = msg.content;
      } else {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    const payload: AnthropicCompletionRequest = {
      model,
      messages,
      max_tokens: request.maxTokens ?? 4000,
      temperature: request.temperature ?? 0.7,
      ...(systemPrompt && { system: systemPrompt }),
    };

    const response = await fetch(`${this.baseURL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${error}`);
    }

    const data: AnthropicCompletionResponse = await response.json();

    return {
      content: data.content[0].text,
      model: data.model,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
    };
  }

  /**
   * Validate Anthropic API key
   */
  async validateApiKey(): Promise<boolean> {
    try {
      // Anthropic doesn't have a models endpoint, so we make a minimal request
      const response = await fetch(`${this.baseURL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        }),
      });

      // 200 or 400 (bad request) means the key is valid
      // 401 means invalid key
      return response.status !== 401;
    } catch (error) {
      console.error('Anthropic API key validation failed:', error);
      return false;
    }
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'Anthropic Claude';
  }
}
