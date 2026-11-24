import { useState, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import * as api from '../services/api';

/**
 * Steps in the validation pipeline
 */
export const STEPS = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  EXTRACTING: 'extracting',
  COMPARING: 'comparing',
  DONE: 'done',
  ERROR: 'error',
};

const STEP_ORDER = [STEPS.IDLE, STEPS.UPLOADING, STEPS.EXTRACTING, STEPS.COMPARING, STEPS.DONE];

const initialState = {
  step: STEPS.IDLE,
  progress: 0,
  sessionId: null,
  uploadedFiles: [],
  extractedDocs: [],
  mismatches: [],
  extractionIssues: [],
  extractionSummary: null,
  overallStatus: null,
  warnings: [],
  riskScore: null,
  aiSummary: null,
  fraudAssessment: null,
  complianceStatus: null,
  error: null,
  processingLog: [],
};

/**
 * useValidation — main state machine hook for the entire validation pipeline
 */
export const useValidation = () => {
  const [state, setState] = useState(initialState);
  const sessionIdRef = useRef(null);

  const log = (message, type = 'info') => {
    setState((prev) => ({
      ...prev,
      processingLog: [...prev.processingLog, {
        message,
        type,
        timestamp: new Date().toISOString(),
      }],
    }));
  };

  const setStep = (step, extra = {}) => {
    setState((prev) => ({ ...prev, step, ...extra }));
  };

  /**
   * Run the full pipeline: upload → extract → compare
   */
  const runValidation = useCallback(async (files, expectedHsCode = '') => {
    if (!files || files.length === 0) {
      toast.error('Please upload at least one document');
      return;
    }

    setState({ ...initialState, step: STEPS.UPLOADING, progress: 5 });
    log('Starting CustomsGuardian AI validation pipeline...');

    try {
      // ─── Step 1: Upload ───────────────────────────────
      log(`Uploading ${files.length} file(s)...`);
      toast.loading('Uploading documents...', { id: 'pipeline' });

      const uploadResult = await api.uploadFiles(files, null, (pct) => {
        setState((prev) => ({ ...prev, progress: Math.round(pct * 0.2) }));
      });
      
      const { sessionId, files: uploadedFiles } = uploadResult;
      sessionIdRef.current = sessionId;

      setState((prev) => ({
        ...prev,
        step: STEPS.EXTRACTING,
        progress: 20,
        sessionId,
        uploadedFiles,
      }));

      log(`✅ ${uploadedFiles.length} file(s) uploaded (Session: ${sessionId})`);

      // ─── Step 2: Start Validation Pipeline ──────────────────
      log('Running OCR and Gemini AI extraction...');
      toast.loading('Starting asynchronous validation pipeline...', { id: 'pipeline' });

      await api.startValidation(sessionId, uploadedFiles, expectedHsCode);
      
      setState((prev) => ({
        ...prev,
        step: STEPS.EXTRACTING,
        progress: 25,
      }));

      // ─── Step 3: Poll Job Status ──────────────────────────────
      let jobStatus = 'PROCESSING';
      let compareResult = null;
      let finalExtractionDocs = [];
      let polledJob = null;

      while (jobStatus === 'PROCESSING') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const statusRes = await api.pollValidationStatus(sessionId);
          polledJob = statusRes.job;
          
          if (!polledJob) continue;

          jobStatus = polledJob.status;

          // Update Progress/State based on stage
          if (polledJob.stage === 'EXTRACTION') {
             const extProgress = 25 + Math.round((polledJob.completed / polledJob.total) * 35);
             setState(prev => ({ ...prev, progress: extProgress }));
             log(`⏳ Extracting document ${polledJob.completed}/${polledJob.total}`);
          } else if (polledJob.stage === 'VALIDATION') {
             if (state.step !== STEPS.COMPARING) {
               setState(prev => ({ ...prev, step: STEPS.COMPARING, progress: 65 }));
               log('Running validation engine...');
               log('Running mismatch detection...');
             }
          } else if (polledJob.stage === 'SUMMARY') {
             setState(prev => ({ ...prev, progress: 85 }));
             log('Generating AI compliance summary...');
          }

        } catch (pollErr) {
          console.warn('Polling error (retrying):', pollErr);
        }
      }

      if (jobStatus === 'FAILED') {
        throw new Error(polledJob?.error || 'Validation job failed on the server.');
      }

      // Job is COMPLETED
      compareResult = polledJob?.result;
      
      if (!compareResult) {
        throw new Error('Validation completed but no result was returned.');
      }

      // Fetch the extracted docs from the session if needed (since they were merged into the result)
      // Actually we have extraction summary in the result, and documents in compareResult
      const extractedDocs = compareResult.documents || [];

      // Defensive parsing
      const mismatches = compareResult?.mismatches || [];
      const extraction_issues = compareResult?.extraction_issues || [];
      const extraction = compareResult?.extraction || null;
      const finalDecision = compareResult?.finalDecision || 'REJECT';
      const warnings = compareResult?.warnings || [];
      const riskScore = compareResult?.risk || compareResult?.riskScore || null;
      const aiSummary = compareResult?.summary || compareResult?.aiSummary || null;
      const fraudAssessment = compareResult?.fraudAssessment || null;

      log(`✅ Validation completed`);
      if (finalDecision === 'FAILED') {
        log(`Validation pipeline failed`, 'error');
        log(`Final decision: FAILED`, 'error');
        toast.error('Validation pipeline failed', { id: 'pipeline' });
      } else if (finalDecision === 'REJECT') {
        log(`Validation complete: ${mismatches.length} mismatches`, 'error');
        log(`Final decision: REJECT`, 'error');
        toast.error('Validation failed: Blocking issues detected', { id: 'pipeline' });
        
        mismatches.forEach((m) => {
          log(`⚠️ [${m.severity}] ${m.field}: ${m.documentA} vs ${m.documentB} -> ${m.valueA} vs ${m.valueB}`, 'warn');
        });
      } else {
        log(`Validation complete: ${mismatches.length} mismatches`, 'success');
        log(`Final decision: ACCEPT`, 'success');
        toast.success('Validation complete: ACCEPT', { id: 'pipeline' });
      }

      setState((prev) => ({
        ...prev,
        step: STEPS.DONE,
        progress: 100,
        extractedDocs,
        mismatches,
        extractionIssues: extraction_issues,
        extractionSummary: extraction,
        finalDecision,
        warnings,
        riskScore,
        aiSummary,
        fraudAssessment,
        error: null,
      }));
    } catch (err) {
      const errorMessage = err.message || 'Validation failed';
      log(`❌ Error: ${errorMessage}`, 'error');
      setState((prev) => ({
        ...prev,
        step: STEPS.ERROR,
        error: errorMessage,
      }));
      toast.error(errorMessage, { id: 'pipeline' });
    } finally {
      // Cleanup is mostly automatic now, but just in case
      setState((prev) => {
        if ([STEPS.UPLOADING, STEPS.EXTRACTING, STEPS.COMPARING].includes(prev.step)) {
           // Should not hit this unless user aborts manually or uncaught error
           return prev; 
        }
        return prev;
      });
    }
  }, []);

  /**
   * Download PDF report
   */
  const downloadReport = useCallback(async () => {
    const toastId = toast.loading('Generating PDF report...');
    try {
      await api.generateReport({
        sessionId: state.sessionId,
        reportId: `CG-${Date.now()}`,
        documents: state.uploadedFiles,
        extractedDocuments: state.extractedDocs,
        mismatches: state.mismatches,
        extractionIssues: state.extractionIssues,
        warnings: state.warnings,
        riskScore: state.riskScore,
        aiSummary: state.aiSummary,
        fraudAssessment: state.fraudAssessment,
        processingTime: new Date().toLocaleString(),
      });
      toast.success('PDF report downloaded!', { id: toastId });
    } catch (err) {
      toast.error(`Report failed: ${err.message}`, { id: toastId });
    }
  }, [state]);

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    setState(initialState);
    sessionIdRef.current = null;
  }, []);

  /**
   * Get current step index for progress timeline
   */
  const currentStepIndex = STEP_ORDER.indexOf(state.step);

  return {
    ...state,
    runValidation,
    downloadReport,
    reset,
    currentStepIndex,
    isProcessing: [STEPS.UPLOADING, STEPS.EXTRACTING, STEPS.COMPARING].includes(state.step),
    isDone: state.step === STEPS.DONE,
    isError: state.step === STEPS.ERROR,
  };
};
