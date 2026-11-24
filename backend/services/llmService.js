const groq = require('./providers/groq');
const openrouter = require('./providers/openrouter');
const ollama = require('./providers/ollama');
const { classificationPrompt } = require('../prompts/classificationPrompt');
const { extractionPrompt } = require('../prompts/extractionPrompt');
const { summaryPrompt } = require('../prompts/summaryPrompt');
const logger = require('../utils/logger');

const PROVIDERS = {
  groq,
  openrouter,
  ollama
};

/**
 * Executes a chat request through the fallback chain defined in LLM_PROVIDER_ORDER.
 */
const callLLMFallbackChain = async (messages, options = {}) => {
  const orderRaw = process.env.LLM_PROVIDER_ORDER || 'groq,openrouter,ollama';
  const order = orderRaw.split(',').map(s => s.trim().toLowerCase());

  let lastError = null;

  for (const providerName of order) {
    const provider = PROVIDERS[providerName];
    
    if (!provider) {
      logger.warn(`[LLM] Unknown provider '${providerName}' in order list. Skipping.`);
      continue;
    }

    if (!provider.isConfigured()) {
      logger.info(`[LLM] Provider '${providerName}' is not configured (missing API key). Skipping.`);
      continue;
    }

    try {
      const responseText = await provider.chat(messages, options);
      logger.info(`[LLM] Successfully received response from '${providerName}'.`);
      return responseText;
    } catch (err) {
      logger.error(`[LLM] Provider '${providerName}' failed: ${err.message}`);
      lastError = err;
      // Continue to next provider...
    }
  }

  throw new Error(`All configured LLM providers failed. Last error: ${lastError?.message || 'No providers available.'}`);
};

/**
 * Parse JSON safely from LLM response — strips markdown fences if present
 */
const safeParseJSON = (text) => {
  let cleaned = text.trim();

  // Remove markdown code fences anywhere in the text
  cleaned = cleaned
    .replace(/```json/gi, '')
    .replace(/```/g, '');

  // Find the first { or [
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let start = -1;

  if (firstBrace === -1 && firstBracket === -1) {
    throw new Error('No JSON object found in LLM response');
  }

  if (firstBrace === -1) start = firstBracket;
  else if (firstBracket === -1) start = firstBrace;
  else start = Math.min(firstBrace, firstBracket);

  // Find matching end
  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');
  const end = Math.max(lastBrace, lastBracket);

  if (start === -1 || end === -1) throw new Error('Invalid JSON structure in LLM response');

  const jsonStr = cleaned.substring(start, end + 1);
  return JSON.parse(jsonStr);
};

/**
 * Wrapper to call LLM and safely parse JSON with exactly 1 retry loop for malformed JSON
 */
const callLLMWithJsonRepair = async (prompt, options = {}) => {
  const messages = [{ role: 'user', content: prompt }];
  options.jsonMode = true;

  try {
    const responseText = await callLLMFallbackChain(messages, options);
    return safeParseJSON(responseText);
  } catch (err) {
    logger.warn(`[LLM] JSON parse failed on first attempt: ${err.message}. Retrying with repair prompt...`);
    
    // Repair loop
    messages.push({ role: 'assistant', content: err.responseText || 'Invalid JSON' });
    messages.push({ role: 'user', content: 'Your previous response was not valid JSON. Please return ONLY valid, strictly formatted JSON matching the requested schema. No commentary.' });
    
    const repairResponse = await callLLMFallbackChain(messages, options);
    return safeParseJSON(repairResponse);
  }
};

/**
 * Compute majority vote across multiple objects
 */
const computeMajority = (results) => {
  if (!results || results.length === 0) return { data: null, confidence: {} };
  
  const finalData = {};
  const confidence = {};
  
  // Get all unique keys
  const allKeys = new Set();
  results.forEach(r => Object.keys(r || {}).forEach(k => allKeys.add(k)));

  allKeys.forEach(key => {
    const valueCounts = {};
    let maxCount = 0;
    let majorityValue = null;

    results.forEach(res => {
      const val = res[key];
      // Stringify for deep equality comparison
      const strVal = JSON.stringify(val);
      
      if (strVal !== undefined) {
        valueCounts[strVal] = (valueCounts[strVal] || 0) + 1;
        if (valueCounts[strVal] > maxCount) {
          maxCount = valueCounts[strVal];
          majorityValue = val;
        }
      }
    });

    finalData[key] = majorityValue;
    
    if (maxCount === results.length) {
      confidence[key] = 'high';
    } else if (maxCount > results.length / 2) {
      confidence[key] = 'medium';
    } else {
      confidence[key] = 'low'; // no majority, or severe disagreement
      // In a real app we might set needsReview: true here
    }
  });

  return { data: finalData, confidence };
};

/**
 * Deterministic Content Classifier
 * Uses strict keywords to identify document type before relying on LLM.
 */
const deterministicClassify = (text) => {
  const normText = (text || '').toLowerCase();
  
  // Packing List Scoring
  let plScore = 0;
  if (normText.includes('packing list')) plScore += 10;
  if (normText.includes('packing number') || normText.includes('packing no')) plScore += 5;
  if (normText.includes('net weight') || normText.includes('n.w')) plScore += 3;
  if (normText.includes('gross weight') || normText.includes('g.w')) plScore += 3;
  if (normText.includes('packages') || normText.includes('cartons')) plScore += 2;
  if (normText.includes('marks & numbers')) plScore += 2;

  // Invoice Scoring
  let invScore = 0;
  if (normText.includes('commercial invoice') || normText.includes('proforma invoice')) invScore += 10;
  if (normText.includes('invoice no') || normText.includes('invoice number') || normText.includes('invoice #')) invScore += 5;
  if (normText.includes('invoice date')) invScore += 5;
  if (normText.includes('bill to') || normText.includes('sold to')) invScore += 3;
  if (normText.includes('ship to') || normText.includes('consignee')) invScore += 3;
  if (normText.includes('total amount') || normText.includes('total value') || normText.includes('subtotal')) invScore += 5;
  if (normText.includes('unit price') || normText.includes('price')) invScore += 3;
  if (normText.includes('quantity') || normText.includes('qty')) invScore += 3;
  if (normText.includes('amount')) invScore += 2;
  if (normText.includes('payment terms')) invScore += 2;

  // Certificate of Origin Scoring
  let coScore = 0;
  if (normText.includes('certificate of origin')) coScore += 10;
  if (normText.includes('country of origin')) coScore += 5;
  if (normText.includes('origin criteria')) coScore += 5;
  if (normText.includes('certification authority')) coScore += 3;

  // Evaluate scores
  if (coScore >= 10 || (coScore > plScore && coScore > invScore && coScore >= 5)) {
    return { documentType: 'CERTIFICATE_OF_ORIGIN', evidence: `coScore=${coScore}` };
  } else if (plScore >= 10 || (plScore > invScore && plScore >= 5)) {
    return { documentType: 'PACKING_LIST', evidence: `plScore=${plScore}` };
  } else if (invScore >= 10 || (invScore >= 5)) {
    return { documentType: 'COMMERCIAL_INVOICE', evidence: `invScore=${invScore}` };
  }

  return { documentType: 'UNKNOWN', evidence: `Scores: pl=${plScore}, inv=${invScore}, co=${coScore}` };
};

/**
 * Classify a document by type (Deterministic first, then LLM fallback)
 */
const classifyDocument = async (text) => {
  logger.info('[LLM] Classifying document...');
  const deterministicResult = deterministicClassify(text);
  
  if (deterministicResult.documentType !== 'UNKNOWN') {
    logger.info(`[Classification] Deterministic match: ${deterministicResult.documentType} (${deterministicResult.evidence})`);
    return { documentType: deterministicResult.documentType, confidence: 'high', evidence: deterministicResult.evidence };
  }

  try {
    const prompt = classificationPrompt(text);
    
    // TEMPORARY LOG FOR DEBUGGING
    console.log("CLASSIFICATION PROMPT SUBMITTED.");
    
    const parsed = await callLLMWithJsonRepair(prompt);
    console.log("CLASSIFICATION RAW RESPONSE PARSED:", parsed);
    
    // Normalize LLM output to canonical internal types
    let docType = (parsed.documentType || 'UNKNOWN').toUpperCase().replace(/ /g, '_');
    if (docType === 'CERTIFICATE_OF_ORIGIN' || docType === 'PACKING_LIST' || docType === 'COMMERCIAL_INVOICE') {
      // valid canonical type
    } else if (docType.includes('CERTIFICATE')) {
      docType = 'CERTIFICATE_OF_ORIGIN';
    } else if (docType.includes('PACKING')) {
      docType = 'PACKING_LIST';
    } else if (docType.includes('INVOICE')) {
      docType = 'COMMERCIAL_INVOICE';
    } else {
      docType = 'UNKNOWN';
    }
    
    logger.info(`[LLM] Classification fallback: ${docType} (raw: ${parsed.documentType})`);
    return { ...parsed, documentType: docType, evidence: 'LLM Fallback' };
  } catch (err) {
    logger.error(`[LLM] Classification failed: ${err.message}`);
    throw err;
  }
};

/**
 * Extract structured data using self-consistency voting, with retry logic
 */
const extractDocumentData = async (text, documentType) => {
  const passesCount = parseInt(process.env.LLM_EXTRACTION_PASSES || '3', 10);
  const maxRetries = 2;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    logger.info(`[LLM] Extraction attempt ${attempt}/${maxRetries} for ${documentType}...`);
    
    // If it's a retry, we can use a slightly stricter prompt constraint.
    const basePrompt = extractionPrompt(text, documentType);
    const prompt = attempt === 1 
      ? basePrompt 
      : basePrompt + '\n\nCRITICAL: YOU MUST RETURN ONLY VALID JSON. NO OTHER TEXT.';
      
    const promises = [];
    for (let i = 0; i < passesCount; i++) {
      promises.push(callLLMWithJsonRepair(prompt));
    }

    try {
      const results = await Promise.allSettled(promises);
      const validResults = results
        .filter(r => r.status === 'fulfilled' && r.value !== null)
        .map(r => r.value);

      if (validResults.length === 0) {
        throw new Error('All self-consistency passes failed.');
      }

      logger.info(`[LLM] ${validResults.length}/${passesCount} passes succeeded. Computing majority...`);
      const { data, confidence } = computeMajority(validResults);
      
      // Basic heuristic to check if extraction actually got useful data
      const hasUsefulData = Object.keys(data || {}).some(k => {
        const val = data[k];
        return val !== null && val !== undefined && val !== '' && 
               !(typeof val === 'object' && Object.keys(val).length === 0) &&
               !(Array.isArray(val) && val.length === 0);
      });

      if (!hasUsefulData) {
        throw new Error('Extracted JSON contained no useful data.');
      }

      Object.defineProperty(data, '_confidence', {
        value: confidence,
        enumerable: false
      });

      logger.info(`[LLM] Extraction SUCCESS on attempt ${attempt}`);
      return data;
    } catch (err) {
      logger.error(`[LLM] Extraction attempt ${attempt} failed: ${err.message}`);
      if (attempt < maxRetries) {
        logger.info(`[LLM] Extraction retry triggered`);
      } else {
        logger.info(`[LLM] Extraction FAILED after ${maxRetries} attempts`);
        throw new Error(`LLM extraction failed after ${maxRetries} attempts: ${err.message}`);
      }
    }
  }
};

/**
 * Generate an AI summary of the validation results (single pass)
 */
const generateAISummary = async (comparisonResult) => {
  logger.info('[LLM] Generating AI summary...');
  try {
    const prompt = summaryPrompt(comparisonResult);
    const parsed = await callLLMWithJsonRepair(prompt);
    logger.info('[LLM] AI summary generated');
    return parsed;
  } catch (err) {
    logger.error(`[LLM] Summary generation failed: ${err.message}`);
    return {
      headline: 'Validation complete',
      body: 'The document validation has been completed. Please review the mismatches and risk score above.',
      keyFindings: [],
      recommendation: 'Manual review recommended.',
      complianceStatus: comparisonResult.complianceStatus || 'NON_COMPLIANT',
    };
  }
};

const isApiKeyConfigured = () => {
  // Check if at least one cloud provider has a key, or we assume Ollama is always fine
  const orderRaw = process.env.LLM_PROVIDER_ORDER || 'groq,openrouter,ollama';
  const order = orderRaw.split(',').map(s => s.trim().toLowerCase());
  
  for (const name of order) {
    if (PROVIDERS[name] && PROVIDERS[name].isConfigured()) return true;
  }
  return false;
};

/**
 * Generate an AI Fraud & Authenticity Assessment
 */
const assessFraudRisk = async (validationResult) => {
  logger.info('[LLM] Generating Fraud & Authenticity Assessment...');
  
  const prompt = `You are a Senior Customs Fraud Investigator AI.
Your job is to analyze the anomalies and mismatches found in these customs documents and determine the probability that the documents are FAKE, FORGED, or MANUALLY TAMPERED WITH to evade duties.

Here are the anomalies detected by the rule-engine:
Mismatches & Critical Flags: ${JSON.stringify(validationResult.mismatches, null, 2)}
Warnings: ${JSON.stringify(validationResult.warnings, null, 2)}

Instructions:
1. "Mathematical Inconsistency" (line items sum != stated total) is a MASSIVE red flag for forgery (90%+ fake probability).
2. "Date Anomaly" (future dates) is a strong forgery indicator.
3. Missing fields (e.g. "Missing HS Code", "Missing Invoice Reference") in Warnings are usually benign document completeness issues, NOT fraud. Do NOT lower authenticity score significantly for them.
4. Minor typos (e.g. "Acme Inc" vs "Acme Inc.") are normal, do not flag as fraud.
5. Provide an 'authenticityScore' from 0 (100% fake) to 100 (100% genuine).

Respond ONLY in this exact JSON format:
{
  "authenticityScore": number,
  "isFraudulent": boolean,
  "fraudAnalysis": "Detailed 2-3 sentence explanation of your conclusion",
  "primaryRiskFactor": "The main anomaly driving this score, or 'None'"
}`;

  try {
    const parsed = await callLLMWithJsonRepair(prompt);
    logger.info(`[LLM] Fraud Assessment: Score ${parsed.authenticityScore}%, isFraudulent: ${parsed.isFraudulent}`);
    return parsed;
  } catch (err) {
    logger.error(`[LLM] Fraud Assessment failed: ${err.message}`);
    return {
      authenticityScore: null,
      isFraudulent: null,
      status: 'UNAVAILABLE',
      fraudAnalysis: 'AI analysis timed out',
      primaryRiskFactor: null
    };
  }
};

module.exports = {
  classifyDocument,
  extractDocumentData,
  generateAISummary,
  assessFraudRisk,
  isApiKeyConfigured,
};
