import React from 'react';
import { motion } from 'framer-motion';
import { FiAlertTriangle, FiAlertCircle, FiInfo, FiZap, FiFileText } from 'react-icons/fi';

const SEVERITY_CONFIG = {
  Critical: {
    icon: FiZap,
    colorClass: 'badge-critical',
    bgClass: 'bg-red-950/40 border-red-900/40',
    iconColor: '#fca5a5',
    glow: '0 0 20px rgba(220, 38, 38, 0.15)',
  },
  High: {
    icon: FiAlertTriangle,
    colorClass: 'badge-high',
    bgClass: 'bg-orange-950/40 border-orange-900/40',
    iconColor: '#fdba74',
    glow: '0 0 20px rgba(234, 88, 12, 0.1)',
  },
  Medium: {
    icon: FiAlertCircle,
    colorClass: 'badge-medium',
    bgClass: 'bg-yellow-950/40 border-yellow-900/40',
    iconColor: '#fcd34d',
    glow: 'none',
  },
  Low: {
    icon: FiInfo,
    colorClass: 'badge-low',
    bgClass: 'bg-green-950/40 border-green-900/40',
    iconColor: '#86efac',
    glow: 'none',
  },
  Info: {
    icon: FiInfo,
    colorClass: 'badge-low',
    bgClass: 'bg-blue-950/40 border-blue-900/40',
    iconColor: '#93c5fd',
    glow: 'none',
  },
};

export default function MismatchCard({ mismatch, index }) {
  if (!mismatch) return null;

  const config = SEVERITY_CONFIG[mismatch.severity] || SEVERITY_CONFIG.Low;
  const Icon = config.icon;

  const docA = mismatch.documentA || mismatch.document || 'Expected';
  const docB = mismatch.documentB || 'Actual';
  const valA = mismatch.valueA !== undefined ? mismatch.valueA : mismatch.expected;
  const valB = mismatch.valueB !== undefined ? mismatch.valueB : mismatch.actual;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 150, damping: 20 }}
      className={`rounded-xl border p-4 ${config.bgClass}`}
      style={{ boxShadow: config.glow }}
      id={`mismatch-card-${index}`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: `${config.iconColor}15` }}
        >
          <Icon style={{ color: config.iconColor }} className="text-base" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="text-white font-semibold text-sm">{mismatch.field}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${config.colorClass}`}>
              {mismatch.severity}
            </span>
            {mismatch.status && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${mismatch.status === 'MISSING' ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-700 text-slate-300'}`}>
                {mismatch.status}
              </span>
            )}
          </div>

          <p className="text-slate-400 text-xs mb-3 leading-relaxed">{mismatch.explanation}</p>

          {/* Comparison Grid */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700/50">
              <div className="flex items-center gap-2 mb-2">
                <FiFileText className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {docA}
                </span>
              </div>
              <div className="bg-gray-900/50 rounded p-2 overflow-x-auto">
                {valA === null || valA === 'null' ? (
                  <span className="text-xs text-gray-500 italic">Not found</span>
                ) : (
                  <p className="text-xs text-white font-mono break-all">{String(valA)}</p>
                )}
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700/50">
              <div className="flex items-center gap-2 mb-2">
                <FiFileText className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {docB}
                </span>
              </div>
              <div className="bg-gray-900/50 rounded p-2 overflow-x-auto">
                {valB === null || valB === 'null' ? (
                  <span className="text-xs text-gray-500 italic">Not found</span>
                ) : (
                  <p className="text-xs text-white font-mono break-all">{String(valB)}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
