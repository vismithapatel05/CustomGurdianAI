import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const RISK_COLORS = {
  Low: { start: '#22c55e', end: '#16a34a', glow: 'rgba(34, 197, 94, 0.4)', bg: 'rgba(34, 197, 94, 0.1)' },
  Medium: { start: '#f59e0b', end: '#d97706', glow: 'rgba(245, 158, 11, 0.4)', bg: 'rgba(245, 158, 11, 0.1)' },
  High: { start: '#ef4444', end: '#dc2626', glow: 'rgba(239, 68, 68, 0.4)', bg: 'rgba(239, 68, 68, 0.1)' },
  Critical: { start: '#dc2626', end: '#7f1d1d', glow: 'rgba(220, 38, 38, 0.6)', bg: 'rgba(220, 38, 38, 0.15)' },
};

export default function RiskGauge({ riskScore }) {
  const canvasRef = useRef(null);
  const score = riskScore?.score ?? 0;
  const level = riskScore?.level ?? 'Low';
  const breakdown = riskScore?.breakdown || {};
  const colors = RISK_COLORS[level] || RISK_COLORS.Low;

  // Draw SVG-like gauge on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H * 0.72;
    const radius = Math.min(W, H) * 0.38;
    const lineWidth = 16;

    ctx.clearRect(0, 0, W, H);

    // Background arc
    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI, 2 * Math.PI);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.8)';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Colored arc (score-based)
    const gradient = ctx.createLinearGradient(0, 0, W, 0);
    gradient.addColorStop(0, '#22c55e');
    gradient.addColorStop(0.4, '#f59e0b');
    gradient.addColorStop(0.7, '#ef4444');
    gradient.addColorStop(1, '#7f1d1d');

    const endAngle = Math.PI + (score / 100) * Math.PI;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI, endAngle);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = gradient;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Glow effect on needle tip
    const needleAngle = Math.PI + (score / 100) * Math.PI;
    const tipX = cx + radius * Math.cos(needleAngle);
    const tipY = cy + radius * Math.sin(needleAngle);

    const glowGrad = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, 20);
    glowGrad.addColorStop(0, colors.glow);
    glowGrad.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(tipX, tipY, 20, 0, 2 * Math.PI);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    // Needle dot
    ctx.beginPath();
    ctx.arc(tipX, tipY, 7, 0, 2 * Math.PI);
    ctx.fillStyle = colors.start;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tipX, tipY, 3, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#334155';
    ctx.fill();

    // Tick marks
    for (let i = 0; i <= 10; i++) {
      const angle = Math.PI + (i / 10) * Math.PI;
      const innerR = radius - lineWidth;
      const outerR = radius + 6;
      const x1 = cx + innerR * Math.cos(angle);
      const y1 = cy + innerR * Math.sin(angle);
      const x2 = cx + outerR * Math.cos(angle);
      const y2 = cy + outerR * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = i % 5 === 0 ? 2 : 1;
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.5)';
      ctx.stroke();
    }
  }, [score, colors]);

  return (
    <div className="risk-gauge-container">
      {/* Canvas Gauge */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={280}
          height={170}
          className="mx-auto block"
          id="risk-gauge-canvas"
        />

        {/* Score display */}
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <motion.p
            key={score}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="text-4xl font-black"
            style={{ color: colors.start, textShadow: `0 0 20px ${colors.glow}` }}
          >
            {score}
          </motion.p>
          <p className="text-xs text-slate-500 mt-0.5">Risk Score</p>
        </div>
      </div>

      {/* Risk Level Badge */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: 'spring' }}
        className="mt-3 px-6 py-2 rounded-full font-bold text-sm tracking-wide"
        style={{
          background: colors.bg,
          color: colors.start,
          border: `1px solid ${colors.glow}`,
          boxShadow: `0 0 20px ${colors.glow}`,
        }}
        id="risk-level-badge"
      >
        {level} Risk
      </motion.div>

      {/* Range Labels */}
      <div className="flex justify-between w-full max-w-[240px] mt-2 text-xs text-slate-600 px-2">
        <span>0</span>
        <span>Low</span>
        <span>Medium</span>
        <span>High</span>
        <span>100</span>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-4 gap-2 mt-4 w-full">
        {[
          { label: 'Critical', count: breakdown.criticalCount || 0, color: '#dc2626' },
          { label: 'High', count: breakdown.highCount || 0, color: '#ea580c' },
          { label: 'Medium', count: breakdown.mediumCount || 0, color: '#d97706' },
          { label: 'Low', count: breakdown.lowCount || 0, color: '#22c55e' },
        ].map(({ label, count, color }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl p-2.5 text-center"
            style={{ background: `${color}10`, border: `1px solid ${color}25` }}
          >
            <p className="text-lg font-bold" style={{ color }}>{count}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
