const logger = require('../utils/logger');

/**
 * Risk weights per severity level and field type
 */
const RISK_WEIGHTS = {
  Critical: 40,
  High: 30,
  Medium: 20,
  Low: 10,
};

/**
 * Additional bonus weights for specific dangerous field types
 */
const FIELD_BONUSES = {
  'country_of_origin': 15,
  'total_invoice_value': 15,
  'hs_code': 15,
  'duplicate_invoice': 30,
  'container_number': 10,
};

/**
 * Risk level thresholds
 */
const RISK_THRESHOLDS = {
  LOW: 30,
  MEDIUM: 60,
  HIGH: 90,
};

/**
 * Calculate overall risk score from mismatches and warnings
 */
const calculateRiskScore = (mismatches = [], warnings = [], fraudAssessment = null, extractionIssues = []) => {
  let score = 0;

  if (fraudAssessment) {
    if (fraudAssessment.isFraudulent) {
      score += 100; // Suspected fraud immediately pushes it to critical
    } else if (fraudAssessment.authenticityScore !== undefined && fraudAssessment.authenticityScore !== null) {
      score += (100 - fraudAssessment.authenticityScore); // Lower authenticity increases risk
    }
  }

  // Score from mismatches
  mismatches.forEach((m) => {
    if (m.type === 'NOT_AVAILABLE' || m.severity === 'Info') return;
    
    const baseWeight = RISK_WEIGHTS[m.severity] || 10;
    let bonus = 0;
    Object.keys(FIELD_BONUSES).forEach((fieldPattern) => {
      if (m.field && m.field.toLowerCase().includes(fieldPattern.toLowerCase())) {
        bonus = FIELD_BONUSES[fieldPattern];
      }
    });
    score += baseWeight + bonus;
  });

  // Score from warnings (lower weight - missing fields shouldn't instantly flag as high risk)
  warnings.forEach((w) => {
    const baseWeight = (RISK_WEIGHTS[w.severity] || 10) * 0.1;
    score += baseWeight;
  });

  // Normalize to 0-100
  const normalizedScore = Math.min(Math.round(score), 100);

  // Determine risk level
  let level;
  if (normalizedScore >= RISK_THRESHOLDS.HIGH) {
    level = 'Critical';
  } else if (normalizedScore >= RISK_THRESHOLDS.MEDIUM) {
    level = 'High';
  } else if (normalizedScore >= RISK_THRESHOLDS.LOW) {
    level = 'Medium';
  } else {
    level = 'Low';
  }
  
  if (extractionIssues && extractionIssues.length > 0 && level !== 'Critical' && level !== 'High') {
    level = 'REVIEW_REQUIRED';
  }

  logger.info(`[Risk] Score: ${normalizedScore} → Level: ${level}`);

  return {
    score: normalizedScore,
    level,
    rawScore: score,
    breakdown: {
      fromMismatches: mismatches.length,
      fromWarnings: warnings.length,
      criticalCount: mismatches.filter((m) => m.severity === 'Critical').length,
      highCount: mismatches.filter((m) => m.severity === 'High').length,
      mediumCount: mismatches.filter((m) => m.severity === 'Medium').length,
      lowCount: mismatches.filter((m) => m.severity === 'Low').length,
    },
  };
};

/**
 * Get color for risk level (used in reports)
 */
const getRiskColor = (level) => {
  const colors = {
    Low: '#22c55e',
    Medium: '#f59e0b',
    High: '#ef4444',
    Critical: '#7f1d1d',
  };
  return colors[level] || '#6b7280';
};

module.exports = { calculateRiskScore, getRiskColor };
