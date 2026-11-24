const { generatePDFReport } = require('../services/reportService');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * POST /api/report
 * Body: { sessionId, documents, extractedDocuments, mismatches, warnings, riskScore, aiSummary }
 * Generates and streams a PDF report
 */
const generateReport = async (req, res, next) => {
  try {
    const reportData = {
      ...req.body,
      reportId: `CG-${uuidv4().slice(0, 8).toUpperCase()}`,
      generatedAt: new Date().toISOString(),
    };

    logger.info(`[Report] Generating PDF report ${reportData.reportId}`);

    const pdfBuffer = await generatePDFReport(reportData);

    const filename = `CustomsGuardian_Report_${reportData.reportId}_${Date.now()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    logger.info(`[Report] ✅ PDF generated: ${filename} (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);

    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

module.exports = { generateReport };
