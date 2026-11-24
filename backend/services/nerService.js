const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Call the optional Python NER microservice for an extraction cross-check.
 * Gracefully fails if the service is not running.
 */
const extractWithNER = async (text, documentType) => {
  const nerUrl = process.env.NER_SERVICE_URL;
  if (!nerUrl || nerUrl.trim() === '') {
    return null; // NER service not configured
  }

  logger.info(`[NER] Calling optional NER microservice at ${nerUrl}...`);

  try {
    const response = await axios.post(
      `${nerUrl}/extract`,
      { text, documentType },
      { timeout: 5000 } // 5s timeout, it should be fast
    );

    return response.data.data;
  } catch (error) {
    logger.warn(`[NER] NER microservice failed or unreachable: ${error.message}. Proceeding without it.`);
    return null;
  }
};

/**
 * Merge NER results with LLM results to boost or lower confidence scores.
 * Modifies the confidence object in place.
 */
const mergeNERCrossCheck = (llmData, llmConfidence, nerData) => {
  if (!nerData || Object.keys(nerData).length === 0) return;

  Object.keys(nerData).forEach(key => {
    const nerVal = nerData[key];
    const llmVal = llmData[key];

    // Simple cross-check logic
    if (nerVal && llmVal) {
      if (String(nerVal).trim().toLowerCase() === String(llmVal).trim().toLowerCase()) {
        // Boost confidence if they agree
        llmConfidence[key] = 'high';
      } else {
        // Flag for manual review if they disagree
        if (llmConfidence[key] !== 'low') {
          llmConfidence[key] = 'needs_review';
        }
      }
    } else if (nerVal && !llmVal) {
      // NER found something LLM missed
      llmData[key] = nerVal;
      llmConfidence[key] = 'needs_review';
    }
  });
};

module.exports = { extractWithNER, mergeNERCrossCheck };
