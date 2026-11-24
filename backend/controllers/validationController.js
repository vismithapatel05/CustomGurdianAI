const path = require('path');
const { sessions } = require('./uploadController');
const { processDocument } = require('./extractController');
const { compareDocumentsLogic } = require('./compareController');
const { generateAISummary, assessFraudRisk, isApiKeyConfigured } = require('../services/llmService');
const logger = require('../utils/logger');

/**
 * Start asynchronous validation pipeline
 */
const startValidation = async (req, res, next) => {
  try {
    const { sessionId, files, expectedHsCode } = req.body;

    if (!sessionId || !files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'sessionId and files are required' });
    }

    if (!sessions[sessionId]) {
       sessions[sessionId] = { uploadedFiles: [], extractedDocs: [], validationResult: null };
    }
    
    // Initialize job state
    sessions[sessionId].job = {
      status: 'PROCESSING',
      stage: 'EXTRACTION',
      completed: 0,
      total: files.length,
      result: null,
      error: null
    };

    const uploadsDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');

    // Run pipeline asynchronously in the background
    (async () => {
      try {
        const session = sessions[sessionId];
        
        // 1. Concurrent Document Extraction
        const extractedDocs = [];
        const limit = 3; // Process 3 at a time max
        
        for (let i = 0; i < files.length; i += limit) {
           const chunk = files.slice(i, i + limit);
           const promises = chunk.map(async (file) => {
              const filepath = path.join(uploadsDir, file.filename);
              const doc = {
                filename: file.filename,
                originalName: file.originalName,
                filepath,
                documentType: 'Unknown',
                data: null,
              };
              
              // 120s timeout wrapper for each document independently
              const timeoutPromise = new Promise((_, reject) => 
                 setTimeout(() => reject(new Error('EXTRACTION_TIMEOUT')), 120000)
              );
              
              try {
                const processedDoc = await Promise.race([
                  processDocument(doc, sessionId), 
                  timeoutPromise
                ]);
                
                return {
                  fileName: processedDoc.originalName,
                  documentType: processedDoc.documentType || 'UNKNOWN',
                  uploaded: true,
                  extractionStatus: processedDoc.extractionStatus || 'FAILED',
                  extractionMethod: processedDoc.ocrMethod || 'unknown',
                  rawTextLength: (processedDoc.pdfCharCount || 0) + (processedDoc.ocrCharCount || 0),
                  extractedData: processedDoc.data || {},
                  confidenceScores: processedDoc.confidenceScores || {}
                };
              } catch (err) {
                 logger.error(`[Extraction Timeout] ${file.originalName} timed out or failed independently: ${err.message}`);
                 return {
                    fileName: file.originalName,
                    documentType: 'UNKNOWN',
                    uploaded: true,
                    extractionStatus: err.message === 'EXTRACTION_TIMEOUT' ? 'TIMEOUT' : 'FAILED',
                    extractionMethod: 'unknown',
                    rawTextLength: 0,
                    extractedData: {},
                    confidenceScores: {}
                 };
              } finally {
                 session.job.completed += 1;
              }
           });
           
           const results = await Promise.all(promises);
           extractedDocs.push(...results);
        }
        
        session.extractedDocs = extractedDocs;
        
        // 2. Validation Engine
        session.job.stage = 'VALIDATION';
        logger.info(`[ValidationJob] Validation starting for session ${sessionId}`);
        
        const { validationResult, finalDecision, extractionBlockingFailuresCount } = await compareDocumentsLogic(sessionId, extractedDocs, expectedHsCode);
        
        // The deterministic decision is ready, record it
        session.validationResult = validationResult;
        
        // 3. AI Summary Generation
        session.job.stage = 'SUMMARY';
        logger.info(`[ValidationJob] Generating AI Summary for session ${sessionId}`);
        
        let aiSummary = null;
        let fraudAssessment = { status: 'UNAVAILABLE', authenticityScore: null };
        
        if (isApiKeyConfigured()) {
          try {
            if (finalDecision === 'REJECT' && extractionBlockingFailuresCount > 0) {
               aiSummary = {
                  headline: 'Validation Pipeline Failed',
                  body: 'The AI could not properly extract documents, leading to a failure in the validation pipeline. Please check the extraction logs and ensure documents are readable.',
                  keyFindings: [],
                  recommendation: 'Re-upload readable documents or manually process.',
                  complianceStatus: 'REJECT',
               };
            } else {
               const summaryPromise = generateAISummary(validationResult);
               const fraudPromise = assessFraudRisk(validationResult);
               
               const summaryTimeout = new Promise((_, r) => setTimeout(() => r(new Error('SUMMARY_TIMEOUT')), 30000));
               
               const [summaryRes, fraudRes] = await Promise.race([
                 Promise.all([summaryPromise, fraudPromise]),
                 summaryTimeout
               ]);
               
               aiSummary = summaryRes;
               fraudAssessment = fraudRes;
            }
          } catch (err) {
            logger.warn(`[ValidationJob] AI Summary timed out or failed, proceeding with decision ${finalDecision}`);
          }
        }
        
        validationResult.summary = aiSummary;
        validationResult.fraudAssessment = fraudAssessment;
        
        // Mark as completed
        session.job.stage = 'DONE';
        session.job.status = 'COMPLETED';
        session.job.result = validationResult;
        logger.info(`[ValidationJob] Validation completely finished for session ${sessionId}`);
        
      } catch (err) {
        logger.error(`[ValidationJob] Pipeline failed: ${err.message}`);
        if (sessions[sessionId] && sessions[sessionId].job) {
           sessions[sessionId].job.status = 'FAILED';
           sessions[sessionId].job.error = err.message;
        }
      }
    })(); // Execute asynchronously

    res.json({
      success: true,
      sessionId,
      status: 'PROCESSING'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get status of validation job
 */
const getValidationStatus = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessions[sessionId] || !sessions[sessionId].job) {
      return res.status(404).json({ success: false, error: 'Session not found or job not started' });
    }

    res.json({
      success: true,
      job: sessions[sessionId].job
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { startValidation, getValidationStatus };
