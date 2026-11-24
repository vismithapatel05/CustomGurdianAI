import React from 'react';
import { motion } from 'framer-motion';
import {
  FiShield, FiZap, FiFileText, FiCheckCircle, FiAlertTriangle,
  FiDownload, FiCpu, FiGlobe, FiLock, FiArrowRight
} from 'react-icons/fi';

const FEATURES = [
  {
    icon: FiCpu,
    title: 'Gemini 2.5 Flash AI',
    description: 'Semantic LLM extraction works on any document layout without hardcoded templates.',
    color: '#60a5fa',
  },
  {
    icon: FiFileText,
    title: 'OCR + PDF Parse',
    description: 'Handles native PDFs and scanned documents with Tesseract.js fallback.',
    color: '#a78bfa',
  },
  {
    icon: FiAlertTriangle,
    title: 'Mismatch Detection',
    description: '20+ field cross-validation with Critical/High/Medium/Low severity levels.',
    color: '#f59e0b',
  },
  {
    icon: FiShield,
    title: 'Risk Scoring',
    description: 'Weighted risk engine generates an overall compliance score from 0–100.',
    color: '#34d399',
  },
  {
    icon: FiGlobe,
    title: 'Any Document Format',
    description: 'Commercial Invoice, Packing List, Bill of Lading, Certificate of Origin, and more.',
    color: '#f472b6',
  },
  {
    icon: FiDownload,
    title: 'PDF Report',
    description: 'Download a professional compliance report with all findings and AI summary.',
    color: '#fb923c',
  },
];

const SUPPORTED_DOCS = [
  'Commercial Invoice', 'Packing List', 'Certificate of Origin',
  'Bill of Lading', 'Proforma Invoice', 'Insurance Certificate',
  'Air Waybill', 'Customs Declaration', 'Scanned Images',
];

const STATS = [
  { value: '20+', label: 'Validated Fields' },
  { value: '6+', label: 'Document Types' },
  { value: '4', label: 'Severity Levels' },
  { value: '100%', label: 'AI-Powered' },
];

export default function LandingPage({ onStart }) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-glow-blue opacity-50 pointer-events-none" style={{ filter: 'blur(80px)' }} />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(167, 139, 250, 0.12), transparent 70%)', filter: 'blur(80px)' }} />

      {/* Hero */}
      <section className="relative pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
              <FiZap className="text-xs" />
              Powered by Google Gemini 2.5 Flash
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight"
            id="hero-title"
          >
            Customs Document
            <span className="block gradient-text">Validation AI</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Upload your import/export documents. Our AI automatically classifies, 
            extracts, cross-validates, and detects mismatches — generating a 
            professional compliance report in seconds.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <button
              onClick={onStart}
              id="get-started-btn"
              className="btn-primary text-lg px-8 py-4 flex items-center gap-2 relative z-10"
            >
              <FiShield className="text-xl" />
              Start Validation
              <FiArrowRight />
            </button>
            <button
              onClick={onStart}
              className="btn-secondary text-lg px-8 py-4"
            >
              View Demo
            </button>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 + 0.4 }}
              className="glass-card p-6 text-center"
            >
              <p className="text-4xl font-black gradient-text-blue">{stat.value}</p>
              <p className="text-slate-400 text-sm mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-white mb-3">Enterprise-Grade Validation</h2>
            <p className="text-slate-400">Everything you need for customs compliance automation</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-6"
                  id={`feature-card-${i}`}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${feature.color}15`, border: `1px solid ${feature.color}30` }}
                  >
                    <Icon style={{ color: feature.color }} className="text-xl" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Supported Documents */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold text-white mb-6">Supported Document Types</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {SUPPORTED_DOCS.map((doc, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="px-4 py-2 rounded-full glass text-slate-300 text-sm font-medium flex items-center gap-2"
                >
                  <FiCheckCircle className="text-green-400 text-xs" />
                  {doc}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Architecture Flow */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card p-8 text-center"
          >
            <h2 className="text-2xl font-bold text-white mb-8">How It Works</h2>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {[
                'Upload Documents',
                'OCR / PDF Parse',
                'Gemini LLM',
                'Extract JSON',
                'Validation Engine',
                'Mismatch Detection',
                'Risk Analysis',
                'AI Summary',
                'Download Report',
              ].map((step, i, arr) => (
                <React.Fragment key={i}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-sm font-medium"
                  >
                    {step}
                  </motion.div>
                  {i < arr.length - 1 && (
                    <span className="text-slate-600 text-lg">→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <FiLock className="text-green-400" />
            <span className="text-green-400 text-sm">Secure · Private · AI-Powered</span>
          </div>
          <h2 className="text-4xl font-black text-white mb-4">
            Ready to validate your<br />
            <span className="gradient-text">customs documents?</span>
          </h2>
          <p className="text-slate-400 mb-8">
            Upload multiple documents simultaneously. Our AI will do the rest.
          </p>
          <button
            onClick={onStart}
            id="cta-btn"
            className="btn-primary text-lg px-10 py-4 inline-flex items-center gap-3"
          >
            <FiShield className="text-xl" />
            Launch CustomsGuardian AI
            <FiArrowRight />
          </button>
        </motion.div>
      </section>
    </div>
  );
}
