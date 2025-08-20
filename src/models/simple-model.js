/**
 * A simple model implementation for chat functionality
 */
export class SimpleModel {
  constructor(config = {}) {
    this.config = {
      name: 'simple-model',
      description: 'A simple echo model for testing',
      temperature: 0.7,
      maxTokens: 1000,
      ...config,
    };
  }

  /**
   * Generate a response to a list of messages
   * @param {Object} params - Generation parameters
   * @param {Array} params.messages - List of messages in the conversation
   * @param {number} [params.temperature] - Sampling temperature
   * @param {number} [params.maxTokens] - Maximum number of tokens to generate
   * @returns {Promise<Object>} The generated response
   */
  async generate({ messages, temperature, maxTokens }) {
    // Get the last user message
    const userMessage = messages
      .slice()
      .reverse()
      .find((m) => m.role === 'user');

    // Simple echo response for now
    const response = {
      id: `resp_${Date.now()}`,
      model: this.config.name,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      choices: [
        {
          message: {
            role: 'assistant',
            content: `You said: ${userMessage?.content || 'Hello!'}`,
          },
          finish_reason: 'stop',
          index: 0,
        },
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };

    return response;
  }

  /**
   * Get model information
   * @returns {Object} Model information
   */
  getInfo() {
    return {
      id: this.config.name,
      name: this.config.name,
      description: this.config.description,
      config: this.config,
    };
  }
}

export default SimpleModel;
