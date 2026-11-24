const axios = require('axios');
const logger = require('../../utils/logger');

const name = 'ollama';

/**
 * Call local Ollama API
 * @param {Array} messages - OpenAI format
 * @param {Object} options - e.g. { jsonMode: true }
 */
const chat = async (messages, options = {}) => {
  const host = process.env.OLLAMA_HOST || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3.1:8b';
  
  logger.info(`[Ollama] Calling ${model} at ${host}...`);

  const payload = {
    model,
    messages,
    stream: false,
    options: {
      temperature: 0.1
    }
  };

  if (options.jsonMode) {
    payload.format = 'json';
  }

  try {
    const response = await axios.post(
      `${host}/api/chat`,
      payload,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 120000 // Local inference can be slow, 2 min timeout
      }
    );

    return response.data.message.content;
  } catch (error) {
    const status = error.response?.status;
    throw new Error(`Ollama API error (${status || 'Network'}): Ensure Ollama is running and model '${model}' is pulled.`);
  }
};

const isConfigured = () => {
  // Local ollama is always "configured" in theory, as it needs no API key.
  return true;
};

module.exports = { name, chat, isConfigured };
