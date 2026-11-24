import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiShield, FiCpu, FiFileText, FiCheckCircle } from 'react-icons/fi';

const steps = [
  { icon: FiFileText, label: 'Uploading Files', color: '#60a5fa' },
  { icon: FiCpu, label: 'OCR & AI Extraction', color: '#a78bfa' },
  { icon: FiCheckCircle, label: 'Validating Documents', color: '#34d399' },
];

export default function LoadingOverlay({ step, progress }) {
  const stepIndex = step === 'uploading' ? 0 : step === 'extracting' ? 1 : 2;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(8px)' }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="glass-card p-10 max-w-md w-full mx-4 text-center"
        >
          {/* Animated Shield */}
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-600/20 border border-blue-500/30 flex items-center justify-center"
          >
            <FiShield className="text-4xl text-blue-400" />
          </motion.div>

          <h3 className="text-xl font-bold text-white mb-2">CustomsGuardian AI</h3>
          <p className="text-slate-400 text-sm mb-8">Processing your documents with AI...</p>

          {/* Step indicators */}
          <div className="space-y-3 mb-8">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === stepIndex;
              const isDone = i < stepIndex;

              return (
                <motion.div
                  key={i}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    isActive ? 'bg-blue-500/10 border border-blue-500/20' : 'opacity-50'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: isDone || isActive ? `${s.color}20` : 'transparent' }}
                  >
                    {isDone ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring' }}
                      >
                        <FiCheckCircle style={{ color: '#22c55e' }} />
                      </motion.div>
                    ) : (
                      <Icon
                        style={{ color: isActive ? s.color : '#4b5563' }}
                        className={isActive ? 'animate-pulse' : ''}
                      />
                    )}
                  </div>
                  <span className="text-sm font-medium text-left" style={{ color: isActive ? '#e2e8f0' : '#6b7280' }}>
                    {s.label}
                  </span>
                  {isActive && (
                    <div className="ml-auto">
                      <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className="progress-bar">
            <motion.div
              className="progress-fill"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">{progress}% complete</p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
