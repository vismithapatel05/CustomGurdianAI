import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUploadCloud, FiFileText, FiAlertTriangle, FiBarChart2,
  FiCpu, FiDownload, FiRefreshCw, FiList, FiClock,
  FiKey, FiExternalLink, FiX, FiCheckCircle
} from 'react-icons/fi';

import { useValidation, STEPS } from '../hooks/useValidation';
import UploadZone from '../components/UploadZone';
import DocumentCard from '../components/DocumentCard';
import MismatchCard from '../components/MismatchCard';
import RiskGauge from '../components/RiskGauge';
import ValidationTable from '../components/ValidationTable';
import AISummary from '../components/AISummary';
import ProcessingTimeline from '../components/ProcessingTimeline';
import LoadingOverlay from '../components/LoadingOverlay';

const TABS = [
  { id: 'upload', label: 'Upload', icon: FiUploadCloud },
  { id: 'documents', label: 'Documents', icon: FiFileText },
  { id: 'comparison', label: 'Comparison', icon: FiList },
  { id: 'mismatches', label: 'Mismatches', icon: FiAlertTriangle },
  { id: 'risk', label: 'Risk', icon: FiBarChart2 },
  { id: 'summary', label: 'AI Summary', icon: FiCpu },
];

export default function DashboardPage() {
  const [files, setFiles] = useState([]);
  const [activeTab, setActiveTab] = useState('upload');
  const [apiKeyStatus, setApiKeyStatus] = useState(null); // null | 'ok' | 'missing'
  const [keyBannerDismissed, setKeyBannerDismissed] = useState(false);
  const [hsCode, setHsCode] = useState('');

  // Check API key health on mount
  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => {
        setApiKeyStatus(data.llmApiKey === 'configured' ? 'ok' : 'missing');
      })
      .catch(() => setApiKeyStatus('missing'));
  }, []);

  const {
    step, progress, extractedDocs, mismatches, extractionIssues, warnings,
    riskScore, aiSummary, fraudAssessment, complianceStatus, overallStatus, finalDecision, processingLog, error,
    runValidation, downloadReport, reset, isProcessing, isDone,
  } = useValidation();

  const handleValidate = () => {
    runValidation(files, hsCode);
  };

  const handleReset = () => {
    setFiles([]);
    setHsCode('');
    reset();
    setActiveTab('upload');
  };

  // Auto-navigate to results when done
  React.useEffect(() => {
    if (isDone && activeTab === 'upload') {
      setTimeout(() => setActiveTab('summary'), 500);
    }
  }, [isDone]);

  const mismatchCount = mismatches?.length || 0;
  const extractionIssueCount = extractionIssues?.length || 0;
  const totalIssueCount = mismatchCount + extractionIssueCount;
  const docCount = extractedDocs?.filter((d) => d.data)?.length || 0;

  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <div className="fixed inset-0 bg-grid opacity-20 pointer-events-none" />

      {/* Loading Overlay */}
      {isProcessing && <LoadingOverlay step={step} progress={progress} />}

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-2xl font-bold text-white" id="dashboard-title">
              Validation Dashboard
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Upload customs documents to begin AI-powered validation
            </p>
          </div>

          {isDone && (
            <div className="flex items-center gap-3">
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={downloadReport}
                id="download-report-btn"
                className="btn-primary flex items-center gap-2 py-2 px-5"
                whileHover={{ scale: 1.02 }}
              >
                <FiDownload />
                Download Report
              </motion.button>
              <button
                onClick={handleReset}
                id="reset-btn"
                className="btn-secondary flex items-center gap-2 py-2 px-4"
              >
                <FiRefreshCw className="text-sm" />
                New Validation
              </button>
            </div>
          )}
        </motion.div>

        {/* ─── Error Banner ─────────────────────────────────── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-700/50 flex items-start gap-3"
              id="validation-error-banner"
            >
              <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <FiAlertTriangle className="text-red-400 text-base" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-red-300 font-semibold text-sm">Validation Failed</p>
                <p className="text-red-400/80 text-xs mt-0.5">{error}</p>
              </div>
              <button onClick={handleReset} className="text-red-500 hover:text-red-300 transition-colors">
                <FiX className="text-lg" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Final Decision Banner ─────────────────────────── */}
        {isDone && finalDecision && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mb-6 p-6 rounded-2xl border ${
              finalDecision === 'ACCEPT' 
                ? 'bg-green-950/40 border-green-500/50' 
                : finalDecision === 'FAILED'
                ? 'bg-amber-950/40 border-amber-500/50'
                : 'bg-red-950/40 border-red-500/50'
            }`}
            id="final-decision-banner"
          >
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 text-3xl ${
                finalDecision === 'ACCEPT' ? 'bg-green-500/20 text-green-400' 
                : finalDecision === 'FAILED' ? 'bg-amber-500/20 text-amber-400'
                : 'bg-red-500/20 text-red-400'
              }`}>
                {finalDecision === 'ACCEPT' ? '✅' : finalDecision === 'FAILED' ? '⚠️' : '❌'}
              </div>
              <div>
                <h2 className={`text-2xl font-bold ${
                  finalDecision === 'ACCEPT' ? 'text-green-400' 
                  : finalDecision === 'FAILED' ? 'text-amber-400'
                  : 'text-red-400'
                }`}>
                  {finalDecision === 'ACCEPT' ? 'ACCEPT' : finalDecision === 'FAILED' ? 'VALIDATION FAILED' : 'REJECT'}
                </h2>
                <p className="text-slate-300 mt-1">
                  {finalDecision === 'ACCEPT' 
                    ? 'Customs documents verified. No blocking discrepancies.' 
                    : finalDecision === 'FAILED'
                    ? 'Validation pipeline failed due to extraction issues.'
                    : 'Documentation discrepancies require correction.'}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Status bar */}
        {isDone && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
          >
            {[
              { label: 'Documents', value: docCount, color: '#60a5fa' },
              { label: 'Mismatches', value: mismatchCount, color: mismatchCount > 0 ? '#ef4444' : '#22c55e' },
              { label: 'Extraction Issues', value: extractionIssueCount, color: extractionIssueCount > 0 ? '#f59e0b' : '#22c55e' },
              { label: 'Risk Level', value: riskScore?.level || '—', color: '#a78bfa' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-4 flex items-center gap-3"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-bold"
                  style={{ background: `${stat.color}15`, color: stat.color }}
                >
                  {typeof stat.value === 'number' ? stat.value : ''}
                </div>
                <div>
                  <p className="text-white font-bold">{stat.value}</p>
                  <p className="text-slate-500 text-xs">{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ─── API Key Warning Banner ─────────────────────────── */}
        <AnimatePresence>
          {apiKeyStatus === 'missing' && !keyBannerDismissed && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-xl bg-amber-950/60 border border-amber-700/50 flex items-start gap-3"
              id="api-key-banner"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <FiKey className="text-amber-400 text-base" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-amber-300 font-semibold text-sm">LLM API Key Not Configured</p>
                <p className="text-amber-400/80 text-xs mt-0.5">
                  Document extraction requires a free cloud API key (or local Ollama). Add it to
                  <code className="mx-1 px-1.5 py-0.5 rounded bg-amber-900/50 font-mono text-amber-300">backend/.env</code>
                  as <code className="px-1.5 py-0.5 rounded bg-amber-900/50 font-mono text-amber-300">GROQ_API_KEY=your_key</code>
                  or <code className="px-1.5 py-0.5 rounded bg-amber-900/50 font-mono text-amber-300">OPENROUTER_API_KEY=your_key</code>
                </p>
                <div className="flex items-center gap-4 mt-1.5">
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 underline"
                  >
                    Get free Groq key <FiExternalLink className="text-xs" />
                  </a>
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 underline"
                  >
                    Get free OpenRouter key <FiExternalLink className="text-xs" />
                  </a>
                </div>
              </div>
              <button
                onClick={() => setKeyBannerDismissed(true)}
                className="text-amber-600 hover:text-amber-400 flex-shrink-0 p-1"
                id="dismiss-api-banner"
              >
                <FiX />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Validation Error Banner ────────────────────────── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-900/50 text-red-300 text-sm flex items-start gap-3"
            >
              <FiAlertTriangle className="flex-shrink-0 mt-0.5 text-base" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold">Validation Error</p>
                <p className="mt-0.5 text-red-400 text-xs break-words">
                  {String(error)
                    .replace(/\[\{.*?\}\]/gs, '')
                    .replace(/Error fetching from https?:\/\/[^\s]+/g, '')
                    .replace('[GoogleGenerativeAI Error]: ', '')
                    .trim()
                    .slice(0, 300)}
                </p>
              </div>
              <button onClick={handleReset} className="ml-auto text-red-500 hover:text-red-300 flex-shrink-0">
                <FiRefreshCw />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Left Sidebar — Timeline */}
          <div className="lg:col-span-1">
            <div className="glass-card p-5 sticky top-24">
              <div className="flex items-center gap-2 mb-4">
                <FiClock className="text-slate-400 text-sm" />
                <h2 className="text-sm font-semibold text-slate-300">Processing Status</h2>
              </div>
              <ProcessingTimeline currentStep={step} processingLog={processingLog} />
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-5">

            {/* Tabs */}
            <div className="flex overflow-x-auto gap-1 p-1 bg-slate-900/60 rounded-2xl border border-slate-700/50">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isAvailable = tab.id === 'upload' || isDone;

                return (
                  <button
                    key={tab.id}
                    onClick={() => isAvailable && setActiveTab(tab.id)}
                    id={`tab-${tab.id}`}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                      activeTab === tab.id
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : isAvailable
                        ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                        : 'text-slate-700 cursor-not-allowed'
                    }`}
                  >
                    <Icon className="text-xs" />
                    {tab.label}
                    {tab.id === 'mismatches' && totalIssueCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500/30 text-red-400 text-xs font-bold">
                        {totalIssueCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* Upload Tab */}
                {activeTab === 'upload' && (
                  <div className="glass-card p-6">
                    <h2 className="text-lg font-bold text-white mb-1">Upload Documents</h2>
                    <p className="text-slate-400 text-sm mb-6">
                      Support PDF, PNG, JPG. AI will auto-classify each document type.
                    </p>
                    <UploadZone
                      files={files}
                      setFiles={setFiles}
                      hsCode={hsCode}
                      setHsCode={setHsCode}
                      onValidate={handleValidate}
                      isProcessing={isProcessing}
                    />
                  </div>
                )}

                {/* Documents Tab */}
                {activeTab === 'documents' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-white">
                        Extracted Documents ({docCount})
                      </h2>
                    </div>
                    {extractedDocs && extractedDocs.length > 0 ? (
                      extractedDocs.map((doc, i) => (
                        <DocumentCard key={i} doc={doc} index={i} />
                      ))
                    ) : (
                      <div className="glass-card p-10 text-center text-slate-500">
                        No documents extracted yet. Run validation first.
                      </div>
                    )}
                  </div>
                )}

                {/* Comparison Tab */}
                {activeTab === 'comparison' && (
                  <div className="glass-card p-6">
                    <h2 className="text-lg font-bold text-white mb-1">Field Comparison</h2>
                    <p className="text-slate-400 text-sm mb-5">
                      Side-by-side comparison of all extracted fields across documents
                    </p>
                    <ValidationTable extractedDocs={extractedDocs} />
                  </div>
                )}

                {/* Mismatches Tab */}
                {activeTab === 'mismatches' && (
                  <div className="space-y-6">
                    {/* Extraction Issues Section */}
                    {extractionIssueCount > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <FiAlertTriangle className="text-amber-400" />
                            Document Extraction Issues ({extractionIssueCount})
                          </h2>
                        </div>
                        <div className="space-y-3">
                          {extractionIssues.map((issue, i) => (
                            <div key={`ext-issue-${i}`} className="glass-card p-4 border border-amber-900/40 bg-amber-950/20">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                                  <FiFileText />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-white font-semibold text-sm">{issue.documentType || 'Unknown Document'}</h3>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                      issue.status === 'FAILED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    }`}>
                                      {issue.status}
                                    </span>
                                  </div>
                                  <p className="text-slate-400 text-xs mt-1">{issue.message}</p>
                                  {issue.status === 'FAILED' && (
                                    <p className="text-red-400/80 text-xs mt-2 font-medium">Re-extraction required.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Customs Mismatches Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                          <FiList className="text-blue-400" />
                          Customs Mismatches ({mismatchCount})
                        </h2>
                      </div>

                      {mismatchCount > 0 ? (
                        <div className="space-y-3">
                          {mismatches.map((m, i) => (
                            <MismatchCard key={m.id || i} mismatch={m} index={i} />
                          ))}
                        </div>
                      ) : (
                        <div className="glass-card p-10 text-center">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-green-500/20">
                            <FiCheckCircle className="text-2xl text-green-400" />
                          </div>
                          <p className="font-semibold text-green-400">
                            No Customs Mismatches
                          </p>
                          <p className="text-slate-500 text-sm mt-1">
                            All extracted fields are consistent across documents.
                          </p>
                        </div>
                      )}
                    </div>

                    {warnings && warnings.length > 0 && (
                      <div className="pt-3">
                        <h3 className="text-sm font-semibold text-slate-400 mb-3">
                          Warnings ({warnings.length})
                        </h3>
                        {warnings.map((w, i) => (
                          <div
                            key={i}
                            className="mb-2 p-3 rounded-xl bg-amber-950/30 border border-amber-900/40"
                          >
                            <p className="text-amber-400 text-sm font-semibold">{w.type}</p>
                            <p className="text-amber-200/70 text-xs mt-1">{w.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Risk Tab */}
                {activeTab === 'risk' && (
                  <div className="glass-card p-6">
                    <h2 className="text-lg font-bold text-white mb-6">Risk Assessment</h2>
                    {riskScore ? (
                      <div className="flex flex-col items-center">
                        <RiskGauge riskScore={riskScore} />
                      </div>
                    ) : (
                      <div className="text-center text-slate-500 py-10">
                        No risk data available yet
                      </div>
                    )}
                  </div>
                )}

                {/* AI Summary Tab */}
                {activeTab === 'summary' && (
                  <div>
                    {aiSummary ? (
                      <AISummary aiSummary={aiSummary} fraudAssessment={fraudAssessment} />
                    ) : (
                      <div className="glass-card p-10 text-center text-slate-500">
                        AI summary will appear here after validation
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
