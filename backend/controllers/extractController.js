const path = require('path');
const fs = require('fs');
const { extractText } = require('../services/ocrService');
const { classifyDocument, extractDocumentData } = require('../services/llmService');
const { extractWithNER, mergeNERCrossCheck } = require('../services/nerService');
const { sessions } = require('./uploadController');
const logger = require('../utils/logger');

/**
 * Process a single document (OCR -> Classify -> Extract -> Validate)
 */
const processDocument = async (doc, sessionId) => {
  let finalExtractionStatus = 'FAILED';
  let extractedData = {};
  let finalMethod = 'unknown';

  // For explicit logging
  let pdfParseSuccess = false;
  let ocrAttempted = false;
  let ocrSuccess = false;
  let geminiAttempted = false;
  let geminiSuccess = false;
  let geminiError = null;
  let geminiResponseLength = 0;
  let classConfidence = 'unknown';

  try {
    logger.info(`[Extract] Processing ${doc.originalName}...`);

    // 1. Text Extraction Pipeline (Phase 8)
    // Assuming extractText returns properties that allow us to deduce this
    let { text, method, pdfCharCount = 0, ocrCharCount = 0, isOcrFallback = false } = await extractText(doc.filepath);
    
    console.log("\n================================================");
    console.log(`[DEBUG] FILE: ${doc.originalName}`);
    console.log(`[DEBUG] TEXT EXTRACTION METHOD: ${method}`);
    console.log(`[DEBUG] EXTRACTED TEXT LENGTH: ${text?.length || 0}`);
    console.log(`[DEBUG] EXTRACTED TEXT PREVIEW: ${text?.slice(0, 300)?.replace(/\n/g, ' ')}`);
    console.log("================================================\n");

    pdfParseSuccess = pdfCharCount > 50;
    ocrAttempted = isOcrFallback || pdfCharCount < 50;
    ocrSuccess = ocrCharCount > 50;
    
    let hasText = text && text.length >= 5;
    doc.pdfCharCount = pdfCharCount;
    doc.ocrCharCount = ocrCharCount;
    finalMethod = method;

    if (!hasText) {
       logger.warn(`[Extract] Text insufficient after PDF/OCR for ${doc.originalName}.`);
    }

    // 2. Classification
    if (hasText) {
      try {
        console.log(`[DEBUG] CLASSIFICATION START: ${doc.originalName}`);
        
        const classification = await classifyDocument(text);
        doc.documentType = classification.documentType;
        doc.classificationEvidence = classification.evidence || 'None';
        classConfidence = 'high'; // LLM classification

        console.log(`[DEBUG] CLASSIFICATION NORMALIZED: ${doc.documentType}`);
      } catch (classErr) {
        console.log(`[DEBUG] CLASSIFICATION ERROR: ${classErr.message}`);
        logger.error(`[Extract] Classification LLM failed: ${classErr.message}`);
        doc.documentType = 'UNKNOWN';
      }
    } else {
      doc.documentType = 'UNKNOWN';
      doc.classificationEvidence = 'No text extracted';
      console.log(`[DEBUG] CLASSIFICATION SKIPPED: No text extracted for ${doc.originalName}`);
    }

    // 3. Data Extraction (LLM + NER parallel)
    if (hasText && doc.documentType !== 'UNKNOWN') {
      geminiAttempted = true;
      let nerData;
      try {
        console.log(`\n[EXTRACTION START] ${doc.originalName}`);
        console.log(`[EXTRACTION TYPE] ${doc.documentType}`);
        console.log(`[EXTRACTION TEXT LENGTH] ${text?.length || 0}`);
        
        [extractedData, nerData] = await Promise.all([
          extractDocumentData(text, doc.documentType),
          extractWithNER(text, doc.documentType)
        ]);
        
        console.log(`[EXTRACTION RAW RESPONSE] ${JSON.stringify(extractedData).slice(0, 150)}...`);
        console.log(`[EXTRACTION PARSED DATA]`, extractedData);
        
        const unwrapValue = (obj) => {
          if (obj === null || obj === undefined) return null;
          if (typeof obj === 'object' && 'value' in obj) return obj.value;
          return obj;
        };

        // Determine SUCCESS vs PARTIAL based on key fields
        let hasRequired = false;
        let hasOptionalMissing = false;
        
        if (doc.documentType === 'PACKING_LIST') {
          hasRequired = !!(unwrapValue(extractedData.invoice_number) || extractedData.items?.length > 0);
          hasOptionalMissing = !unwrapValue(extractedData.packages) || !unwrapValue(extractedData.gross_weight);
        } else if (doc.documentType === 'CERTIFICATE_OF_ORIGIN') {
          hasRequired = !!(unwrapValue(extractedData.certificate_number) || unwrapValue(extractedData.country_of_origin));
          hasOptionalMissing = !unwrapValue(extractedData.invoice_number) || !unwrapValue(extractedData.importer?.name);
        } else { // COMMERCIAL_INVOICE
          hasRequired = !!(unwrapValue(extractedData.invoice_number) && unwrapValue(extractedData.total_invoice_value));
          hasOptionalMissing = !extractedData.items?.length;
        }
        
        if (hasRequired && hasOptionalMissing) {
          finalExtractionStatus = 'PARTIAL';
        } else if (hasRequired) {
          finalExtractionStatus = 'SUCCESS';
        } else {
          // Fallback if some data exists but we can't definitively call it success
          finalExtractionStatus = Object.keys(extractedData).length > 2 ? 'PARTIAL' : 'FAILED';
        }
        
        console.log(`[EXTRACTION STATUS] ${finalExtractionStatus}`);
        
        geminiSuccess = true;
        geminiResponseLength = JSON.stringify(extractedData).length;
      } catch (llmErr) {
        logger.error(`[Extract] LLM Extraction Failed for ${doc.originalName}: ${llmErr.message}`);
        geminiError = llmErr.message;
        finalExtractionStatus = 'FAILED';
        extractedData = {}; 
        console.log(`[EXTRACTION ERROR] ${llmErr.message}`);
        console.log(`[EXTRACTION STATUS] FAILED`);
      }
      
      if (finalExtractionStatus === 'SUCCESS' || finalExtractionStatus === 'PARTIAL') {
        const confidence = extractedData?._confidence || {};
        mergeNERCrossCheck(extractedData, confidence, nerData);
        doc.confidenceScores = confidence;
      }
    } else {
      finalExtractionStatus = 'FAILED';
      console.log(`\n[EXTRACTION START] ${doc.originalName}`);
      console.log(`[EXTRACTION TYPE] ${doc.documentType}`);
      console.log(`[EXTRACTION TEXT LENGTH] ${text?.length || 0}`);
      console.log(`[EXTRACTION ERROR] Document has no text or UNKNOWN type`);
      console.log(`[EXTRACTION STATUS] FAILED`);
    }

    doc.data = extractedData;
    doc.extractionStatus = finalExtractionStatus;
    doc.ocrMethod = finalMethod;

    console.log(`\n========== ${doc.documentType} DEBUG (${doc.originalName}) ==========\n`);
    console.log(`PDF_PARSE:\nsuccess = ${pdfParseSuccess}\ntextLength = ${doc.pdfCharCount}\n`);
    console.log(`OCR:\nattempted = ${ocrAttempted}\nsuccess = ${ocrSuccess}\ntextLength = ${doc.ocrCharCount}\n`);
    console.log(`GEMINI:\nattempted = ${geminiAttempted}\nsuccess = ${geminiSuccess}\nresponseLength = ${geminiResponseLength}\nerror = ${geminiError || 'none'}\n`);
    console.log(`CLASSIFICATION:\ntype = ${doc.documentType}\nconfidence = ${classConfidence}\n`);
    console.log(`FINAL:\nstatus = ${finalExtractionStatus}\n`);

    return doc;
  } catch (err) {
    logger.error(`[Extract] Failed to process ${doc.originalName}: ${err.message}`);
    doc.extractionStatus = 'FAILED';
    doc.data = {};
    doc.ocrMethod = finalMethod;
    return doc;
  }
};

/**
 * POST /api/extract
 * Body: { sessionId, files: [{ filename, originalName }] }
 * Runs OCR + LLM extraction on each file
 */
const extractDocuments = async (req, res, next) => {
  try {
    const { sessionId, files } = req.body;

    if (!sessionId || !files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'sessionId and files are required' });
    }

    const uploadsDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
    const results = [];

    for (const file of files) {
      const filepath = path.join(uploadsDir, file.filename);
      const doc = {
        filename: file.filename,
        originalName: file.originalName,
        filepath,
        documentType: 'Unknown',
        data: null,
      };

      const processedDoc = await processDocument(doc, sessionId);
      
      // Enforce the exact Data Contract requested by the user
      const finalObj = {
        fileName: processedDoc.originalName,
        documentType: processedDoc.documentType || 'UNKNOWN',
        uploaded: true,
        extractionStatus: processedDoc.extractionStatus || 'FAILED',
        extractionMethod: processedDoc.ocrMethod || 'unknown',
        rawTextLength: (processedDoc.pdfCharCount || 0) + (processedDoc.ocrCharCount || 0),
        extractedData: processedDoc.data || {},
        confidenceScores: processedDoc.confidenceScores || {}
      };
      results.push(finalObj);
      
      logger.info(`\n========== EXTRACTION RESULT FOR ${finalObj.fileName} ==========\n${JSON.stringify(finalObj, null, 2)}\n`);
    }

    // Store in session
    if (sessions[sessionId]) {
      sessions[sessionId].extractedDocs = results;
    }

    res.json({
      success: true,
      sessionId,
      results,
      count: results.length,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { extractDocuments, processDocument };
