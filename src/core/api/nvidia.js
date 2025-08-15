import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Map friendly names to valid NVIDIA NIM model identifiers
// See: https://build.nvidia.com/explore/discover
const MODEL_MAP = {
  '20b': 'meta/llama-3.1-8b-instruct',
  '120b': 'meta/llama-3.1-70b-instruct',
  'llama-8b': 'meta/llama-3.1-8b-instruct',
  'llama-70b': 'meta/llama-3.1-70b-instruct',
  'mixtral-8x7b': 'mistralai/mixtral-8x7b-instruct',
  'mixtral-8x22b': 'mistralai/mixtral-8x22b-instruct',
  'gemma-9b': 'google/gemma-2-9b-it'
};

export class NvidiaClient {
  constructor({ apiKey, baseURL = 'https://integrate.api.nvidia.com/v1', model = '20b' } = {}) {
    const envKey = process.env.NVIDIA_API_KEY || process.env.api_key;
    const key = (apiKey || envKey || '').replace(/"/g, '').trim();
    if (!key) throw new Error('NVIDIA_API_KEY or api_key not set in environment');

    this.model = MODEL_MAP[`${model}`.toLowerCase()] || 'meta/llama-3.1-8b-instruct';
    this.openai = new OpenAI({ apiKey: key, baseURL });
  }

  setModel(model) {
    const mapped = MODEL_MAP[`${model}`.toLowerCase()];
    if (mapped) this.model = mapped;
    return this.model;
  }

  async chat(messages, opts = {}) {
    const { temperature = 0.7, top_p = 0.9, max_tokens = 1024 } = opts;
    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages,
      temperature,
      top_p,
      max_tokens,
    });
    const content = completion?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new Error(`Empty content from chat completion for model ${this.model}`);
    }
    return content;
  }

  async respond(input, opts = {}) {
    const { temperature = 0.7, top_p = 0.9, max_output_tokens = 1024 } = opts;
    const response = await this.openai.responses.create({
      model: this.model,
      input: Array.isArray(input) ? input : [input],
      temperature,
      top_p,
      max_output_tokens,
    });
    return response?.output_text ?? '';
  }
}

export default NvidiaClient;
