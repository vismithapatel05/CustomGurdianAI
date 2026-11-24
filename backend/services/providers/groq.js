const axios = require('axios');
const logger = require('../../utils/logger');

const name = 'groq';

/**
 * Call Groq API
 * @param {Array} messages - OpenAI format [{role: 'user', content: '...'}]
 * @param {Object} options - e.g. { jsonMode: true }
 */
// Multiple Groq models with separate free quotas — try each before giving up
const GROQ_FALLBACK_MODELS = [
  process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant'
];

const chat = async (messages, options = {}) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('GROQ_API_KEY is not set');
  }

  let lastError = null;

  for (const model of GROQ_FALLBACK_MODELS) {
    logger.info(`[Groq] Calling ${model}...`);

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
        'https://api.groq.com/openai/v1/chat/completions',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      return response.data.choices[0].message.content;
    } catch (error) {
      const status = error.response?.status;
      const msg = error.response?.data?.error?.message || error.message;
      lastError = new Error(`Groq API error (${status || 'Network'}): ${msg}`);
      // Only retry on rate-limit (429); other errors are fatal
      if (status !== 429) throw lastError;
      logger.warn(`[Groq] Model '${model}' quota hit, trying next Groq model...`);
    }
  }

  throw lastError;
};

const isConfigured = () => {
  const key = process.env.GROQ_API_KEY;
  return !!(key && key.trim() !== '');
};

module.exports = { name, chat, isConfigured };
