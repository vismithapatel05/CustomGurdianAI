import React from 'react';
import { motion } from 'framer-motion';
import {
  FiUploadCloud, FiCpu, FiCheckSquare, FiBarChart2, FiFileText, FiCheckCircle
} from 'react-icons/fi';

const STEPS = [
  {
    id: 'idle',
    icon: FiUploadCloud,
    label: 'Ready',
    description: 'Awaiting document upload',
    color: '#64748b',
  },
  {
    id: 'uploading',
    icon: FiUploadCloud,
    label: 'Upload',
    description: 'Uploading files to server',
    color: '#60a5fa',
  },
  {
    id: 'extracting',
    icon: FiCpu,
    label: 'OCR & Extract',
    description: 'AI reading and extracting data',
    color: '#a78bfa',
  },
  {
    id: 'comparing',
    icon: FiCheckSquare,
    label: 'Validate',
    description: 'Cross-checking documents',
    color: '#34d399',
  },
  {
    id: 'done',
    icon: FiCheckCircle,
    label: 'Complete',
    description: 'Validation results ready',
    color: '#22c55e',
  },
];

export default function ProcessingTimeline({ currentStep, processingLog = [] }) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="space-y-4">
      {/* Step Timeline */}
      <div className="relative">
        {STEPS.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isActive = i === currentIndex;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex items-start gap-3 relative">
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div
                  className="absolute left-[17px] top-9 w-0.5 h-6"
                  style={{
                    background: isCompleted
                      ? `linear-gradient(to bottom, ${step.color}, ${STEPS[i + 1].color})`
                      : 'rgba(51, 65, 85, 0.5)',
                  }}
                />
              )}

              {/* Icon */}
              <motion.div
                animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 1.5, repeat: isActive ? Infinity : 0 }}
                className="relative z-10 w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: (isCompleted || isActive) ? `${step.color}20` : 'rgba(15, 23, 42, 0.8)',
                  border: `1px solid ${(isCompleted || isActive) ? step.color + '40' : 'rgba(51, 65, 85, 0.5)'}`,
                  boxShadow: isActive ? `0 0 15px ${step.color}40` : 'none',
                }}
              >
                {isCompleted ? (
                  <FiCheckCircle style={{ color: step.color }} className="text-base" />
                ) : (
                  <Icon
                    style={{ color: (isActive) ? step.color : '#334155' }}
                    className={`text-base ${isActive ? 'animate-pulse' : ''}`}
                  />
                )}
              </motion.div>

              {/* Text */}
              <div className="flex-1 pb-6">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold" style={{ color: (isCompleted || isActive) ? '#e2e8f0' : '#475569' }}>
                    {step.label}
                  </p>
                  {isActive && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      In Progress
                    </span>
                  )}
                  {isCompleted && (
                    <span className="text-xs text-green-400">Done</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Processing Log */}
      {processingLog.length > 0 && (
        <div className="rounded-xl bg-slate-900/60 border border-slate-700/50 p-3 max-h-48 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Processing Log</p>
          <div className="space-y-1">
            {processingLog.slice(-20).map((entry, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 text-xs"
              >
                <span className="text-slate-600 font-mono flex-shrink-0">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
                <span className={
                  entry.type === 'error' ? 'text-red-400' :
                  entry.type === 'warn' ? 'text-amber-400' :
                  'text-slate-400'
                }>
                  {entry.message}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
