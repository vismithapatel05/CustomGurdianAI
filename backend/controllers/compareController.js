const { validateDocuments } = require('../services/validationService');
const { calculateRiskScore } = require('../services/riskService');
const { sessions } = require('./uploadController');
const logger = require('../utils/logger');

/**
 * POST /api/compare
 * Body: { sessionId, extractedDocs: [...] }
 * Runs validation + mismatch detection + risk scoring + AI summary
 */
const compareDocumentsLogic = async (sessionId, extractedDocs, expectedHsCode) => {
    if (!Array.isArray(extractedDocs) || extractedDocs.length === 0) {
      throw new Error("Validation received invalid documents array");
    }

    const validDocs = extractedDocs.filter((d) => d && d.documentType && d.extractionStatus === 'SUCCESS');
    const failedDocs = extractedDocs.filter((d) => !d || d.extractionStatus !== 'SUCCESS');

    logger.info(`documents.length = ${extractedDocs.length}`);
    logger.info(`validDocs.length = ${validDocs.length}`);
    extractedDocs.forEach(d => {
      logger.info(`fileName = ${d.fileName}\ndocumentType = ${d.documentType}\nextractionStatus = ${d.extractionStatus}\n`);
    });

    logger.info(`[Compare] Validating ${extractedDocs.length} total documents.`);
    
    // Step 1: Validation + Mismatch Detection
    const { findings, warnings, comparisonsPerformed = [], extractionIssues = [] } = validateDocuments(extractedDocs, expectedHsCode);

    const mismatches = findings.filter(f => f.status === 'MISMATCH');
    const missingFields = findings.filter(f => f.status === 'MISSING');
    
    // Step 2: Determine Final Compliance Status
    const determineFinalDecision = () => {
      const hasBlockingExtractionFailure = extractionIssues.some(issue => issue.status === 'FAILED' && issue.severity === 'HIGH');
      const pipelineFailed = extractedDocs.length === 0;
      
      const mismatchCount = mismatches.length;

      if (pipelineFailed) {
        return "FAILED";
      }

      if (hasBlockingExtractionFailure) {
        return "FAILED";
      }

      if (mismatchCount > 0) {
        return "REJECT";
      }

      return "ACCEPT";
    };

    const finalDecision = determineFinalDecision();
    const blockingIssuesCount = findings.filter(f => 
      (f.status === 'MISMATCH' && (f.severity === 'CRITICAL' || f.severity === 'HIGH'))
    ).length;
    const requiredFieldsMissingCount = findings.filter(f => f.status === 'MISSING' && (f.severity === 'CRITICAL' || f.severity === 'HIGH')).length;
    const extractionBlockingFailuresCount = extractionIssues.filter(issue => issue.status === 'FAILED' && issue.severity === 'HIGH').length;

    // Step 3: Risk Scoring (Informational Only)
    let fraudAssessment = { status: 'UNAVAILABLE', authenticityScore: null };
    let riskScore = calculateRiskScore(mismatches, warnings, null, extractionIssues);

    const extractionSummary = {
      successful: extractedDocs.filter(d => d.extractionStatus === 'SUCCESS').length,
      partial: extractedDocs.filter(d => d.extractionStatus === 'PARTIAL').length,
      failed: extractedDocs.filter(d => d.extractionStatus === 'FAILED' || d.documentType === 'UNKNOWN').length,
    };

    const validationResult = {
      sessionId,
      finalDecision,
      mismatchCount: mismatches.length,
      blockingIssues: blockingIssuesCount,
      requiredFieldsMissing: requiredFieldsMissingCount,
      extractionBlockingFailures: extractionBlockingFailuresCount,
      
      // Kept for backward compatibility and internal UI usage
      validation_status: finalDecision === 'REJECT' && extractionBlockingFailuresCount > 0 ? 'FAILED' : 'COMPLETE',
      overall_status: finalDecision, 
      complianceStatus: finalDecision, 
      extraction: extractionSummary,
      findings,
      mismatches,
      missingFields,
      extraction_issues: extractionIssues,
      warnings,
      risk: riskScore,
      comparedAt: new Date().toISOString(),
      documentCount: validDocs.length,
      documents: extractedDocs,
    };

    logger.info('\n==================================================');
    console.log(`\nStarting CustomsGuardian AI validation pipeline\n`);
    console.log(`Uploading ${extractedDocs.length} files\n`);
    console.log(`EXTRACTION RESULTS\n`);
    
    extractedDocs.forEach((doc, idx) => {
      console.log(`Document ${idx + 1}:`);
      console.log(`Filename: ${doc.fileName}`);
      console.log(`Type: ${doc.documentType || 'UNKNOWN'}`);
      console.log(`Extraction: ${doc.extractionStatus}`);
    });
    
    console.log(`VALIDATION\n`);
    console.log(`Comparisons performed:\n${comparisonsPerformed.length}\n`);
    console.log(`Findings found:\n${findings.length}\n`);
    findings.forEach((f, idx) => {
      console.log(`Finding ${idx + 1}:`);
      console.log(`type: ${f.field}`);
      console.log(`severity: ${f.severity}`);
      console.log(`status: ${f.status}`);
      console.log(`documents: ${f.documentA} vs ${f.documentB}`);
      console.log(`values: ${f.valueA} vs ${f.valueB}\n`);
    });
    
    console.log(`FINAL RESULT:\n\n${finalDecision}\n`);
    console.log(`=========================================\n`);

    return { validationResult, finalDecision, extractionBlockingFailuresCount };
};

const compareDocuments = async (req, res, next) => {
  try {
    const { sessionId, extractedDocs, expectedHsCode } = req.body;
    
    const { validationResult, finalDecision, extractionBlockingFailuresCount } = await compareDocumentsLogic(sessionId, extractedDocs, expectedHsCode);

    // Step 5: AI Summary & Fraud Assessment
    const { generateAISummary, assessFraudRisk, isApiKeyConfigured } = require('../services/llmService');
    let aiSummary = null;
    let fraudAssessment = { status: 'UNAVAILABLE', authenticityScore: null };
    
    if (isApiKeyConfigured()) {
      try {
        if (finalDecision === 'FAILED') {
           aiSummary = {
              headline: 'Validation Pipeline Failed',
              body: 'The validation pipeline could not complete because document extraction or processing failed.',
              keyFindings: [],
              recommendation: 'Re-upload readable documents or manually process.',
              complianceStatus: 'FAILED',
           };
        } else {
           const [summaryRes, fraudRes] = await Promise.all([
             generateAISummary(validationResult),
             assessFraudRisk(validationResult)
           ]);
           
           aiSummary = summaryRes;
           fraudAssessment = fraudRes;
           
           // Apply fallback if Gemini fails
           if (!aiSummary || !aiSummary.body) {
             if (finalDecision === 'ACCEPT') {
                aiSummary = {
                   headline: '✅ ACCEPT',
                   body: 'All submitted customs documents were validated successfully. No blocking discrepancies were detected.',
                   keyFindings: [],
                   recommendation: 'Proceed with shipment processing.',
                   complianceStatus: 'ACCEPT',
                };
             } else if (finalDecision === 'REJECT') {
                aiSummary = {
                   headline: '❌ REJECT',
                   body: 'The submitted customs documents contain one or more blocking discrepancies. Please review the listed findings before proceeding.',
                   keyFindings: [],
                   recommendation: 'Review mismatches and request corrected documents.',
                   complianceStatus: 'REJECT',
                };
             }
           }
        }
      } catch (err) {
        logger.error(`[Compare] AI features failed: ${err.message}`);
        if (finalDecision === 'ACCEPT') {
           aiSummary = {
              headline: '✅ ACCEPT',
              body: 'All submitted customs documents were validated successfully. No blocking discrepancies were detected.',
              keyFindings: [],
              recommendation: 'Proceed with shipment processing.',
              complianceStatus: 'ACCEPT',
           };
        } else if (finalDecision === 'REJECT') {
           aiSummary = {
              headline: '❌ REJECT',
              body: 'The submitted customs documents contain one or more blocking discrepancies. Please review the listed findings before proceeding.',
              keyFindings: [],
              recommendation: 'Review mismatches and request corrected documents.',
              complianceStatus: 'REJECT',
           };
        }
      }
    }
    
    validationResult.summary = aiSummary;
    validationResult.fraudAssessment = fraudAssessment;

    if (sessionId && sessions[sessionId]) {
      sessions[sessionId].validationResult = validationResult;
    }

    res.json({
      success: true,
      ...validationResult,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { compareDocuments, compareDocumentsLogic };
