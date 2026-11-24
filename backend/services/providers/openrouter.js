const axios = require('axios');
const logger = require('../../utils/logger');

const name = 'openrouter';

/**
 * Call OpenRouter API
 * @param {Array} messages - OpenAI format
 * @param {Object} options - e.g. { jsonMode: true }
 */
// Multiple free OpenRouter models to try in sequence
const OPENROUTER_FREE_MODELS = [
  process.env.OPENROUTER_MODEL || 'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'google/gemma-4-26b-a4b-it:free',
  'mistralai/mistral-7b-instruct:free',
  'qwen/qwen3-8b:free',
];

const chat = async (messages, options = {}) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  let lastError = null;

  for (const model of OPENROUTER_FREE_MODELS) {
    logger.info(`[OpenRouter] Calling ${model}...`);

    const payload = {
      model,
      messages,
      temperature: 0.1,
    };

    if (options.jsonMode) {
      payload.response_format = { type: 'json_object' };
    }

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
            'X-Title': 'CustomsGuardian AI',
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      return response.data.choices[0].message.content;
    } catch (error) {
      const status = error.response?.status;
      const msg = error.response?.data?.error?.message || error.message;
      lastError = new Error(`OpenRouter API error (${status || 'Network'}): ${msg}`);
      // Retry on 429 (rate limit) or 404 (model unavailable), fail fast on other errors
      if (status !== 429 && status !== 404) throw lastError;
      logger.warn(`[OpenRouter] Model '${model}' unavailable (${status}), trying next model...`);
    }
  }

  throw lastError;
};

const isConfigured = () => {
  const key = process.env.OPENROUTER_API_KEY;
  return !!(key && key.trim() !== '');
};

module.exports = { name, chat, isConfigured };
