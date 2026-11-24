const PDFDocument = require('pdfkit');
const { getRiskColor } = require('./riskService');

/**
 * Generate a professional PDF validation report
 * @param {Object} reportData - Full validation report data
 * @returns {Buffer} - PDF buffer
 */
const generatePDFReport = (reportData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true,
        info: {
          Title: 'CustomsGuardian AI - Validation Report',
          Author: 'CustomsGuardian AI',
          Subject: 'Customs Documentation Validation',
          Creator: 'CustomsGuardian AI v1.0',
        },
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const PAGE_WIDTH = doc.page.width - 100; // margins

      // ─── Header ───────────────────────────────────
      doc.rect(0, 0, doc.page.width, 80).fill('#0f172a');
      doc.fillColor('#60a5fa').fontSize(22).font('Helvetica-Bold')
        .text('🛡️ CustomsGuardian AI', 50, 20);
      doc.fillColor('#94a3b8').fontSize(10).font('Helvetica')
        .text('Customs Documentation Validation Report', 50, 48);
      doc.fillColor('#64748b').fontSize(8)
        .text(`Generated: ${new Date().toUTCString()}`, 50, 62);

      doc.moveDown(2);

      // ─── Report ID & Session ──────────────────────
      doc.fillColor('#1e293b').rect(50, 90, PAGE_WIDTH, 40).fill();
      doc.fillColor('#94a3b8').fontSize(9).font('Helvetica')
        .text(`Report ID: ${reportData.reportId || 'N/A'}`, 60, 100)
        .text(`Session: ${reportData.sessionId || 'N/A'}`, 60, 113)
        .text(`Documents Analyzed: ${reportData.documents?.length || 0}`, 300, 100)
        .text(`Validation Time: ${reportData.processingTime || 'N/A'}`, 300, 113);

      doc.y = 145;
      doc.moveDown(0.5);

      // ─── Risk Score ───────────────────────────────
      const risk = reportData.riskScore || { score: 0, level: 'Unknown' };
      const riskColor = getRiskColor(risk.level);

      sectionTitle(doc, 'Overall Risk Assessment');

      doc.fillColor(riskColor).fontSize(48).font('Helvetica-Bold')
        .text(`${risk.score}`, 50, doc.y, { continued: false });

      doc.fontSize(14).font('Helvetica')
        .text(`Risk Level: ${risk.level}`, 50, doc.y);

      const breakdown = risk.breakdown || {};
      doc.fillColor('#64748b').fontSize(10)
        .text(`Critical: ${breakdown.criticalCount || 0}  |  High: ${breakdown.highCount || 0}  |  Medium: ${breakdown.mediumCount || 0}  |  Low: ${breakdown.lowCount || 0}`, 50, doc.y + 4);

      doc.moveDown(1.5);

      // ─── AI Summary ───────────────────────────────
      const aiSummary = reportData.aiSummary;
      if (aiSummary) {
        sectionTitle(doc, 'AI Compliance Summary');
        doc.fillColor('#1e40af').fontSize(11).font('Helvetica-Bold')
          .text(aiSummary.headline || '', 50, doc.y, { width: PAGE_WIDTH });
        doc.moveDown(0.3);
        doc.fillColor('#334155').fontSize(10).font('Helvetica')
          .text(aiSummary.body || '', 50, doc.y, { width: PAGE_WIDTH });

        if (aiSummary.keyFindings && aiSummary.keyFindings.length > 0) {
          doc.moveDown(0.5);
          doc.fillColor('#374151').fontSize(10).font('Helvetica-Bold').text('Key Findings:', 50, doc.y);
          doc.font('Helvetica');
          aiSummary.keyFindings.forEach((f) => {
            doc.fillColor('#374151').fontSize(10).text(`  • ${f}`, 60, doc.y, { width: PAGE_WIDTH - 20 });
          });
        }

        if (aiSummary.recommendation) {
          doc.moveDown(0.5);
          doc.fillColor('#1e3a5f').fontSize(10).font('Helvetica-Bold')
            .text('Recommendation: ', 50, doc.y, { continued: true });
          doc.font('Helvetica').fillColor('#334155')
            .text(aiSummary.recommendation, { width: PAGE_WIDTH - 10 });
        }

        doc.moveDown(0.5);
        const statusColor = aiSummary.complianceStatus === 'COMPLIANT' ? '#16a34a'
          : aiSummary.complianceStatus === 'NON-COMPLIANT' ? '#dc2626' : '#d97706';
        doc.fillColor(statusColor).fontSize(11).font('Helvetica-Bold')
          .text(`Compliance Status: ${aiSummary.complianceStatus || 'UNKNOWN'}`, 50, doc.y);
      }

      doc.moveDown(1);

      // ─── Documents Analyzed ───────────────────────
      sectionTitle(doc, 'Documents Analyzed');
      if (reportData.extractedDocuments && reportData.extractedDocuments.length > 0) {
        reportData.extractedDocuments.forEach((d, i) => {
          doc.fillColor('#334155').fontSize(10).font('Helvetica')
            .text(`${i + 1}. ${d.documentType || 'Unknown'} — ${d.originalName || d.filename || 'N/A'} (${d.ocrMethod || 'N/A'})`, 60, doc.y, { width: PAGE_WIDTH - 20 });
        });
      }

      doc.moveDown(1);

      // ─── Mismatches ──────────────────────────────
      sectionTitle(doc, `Mismatches Detected (${reportData.mismatches?.length || 0})`);

      if (reportData.mismatches && reportData.mismatches.length > 0) {
        reportData.mismatches.forEach((m, i) => {
          // Check if we need a new page
          if (doc.y > 700) doc.addPage();

          const color = m.severity === 'Critical' ? '#dc2626'
            : m.severity === 'High' ? '#ea580c'
            : m.severity === 'Medium' ? '#d97706'
            : '#16a34a';

          doc.fillColor(color).fontSize(10).font('Helvetica-Bold')
            .text(`[${m.severity}] ${m.field}`, 60, doc.y);
          doc.fillColor('#374151').fontSize(9).font('Helvetica')
            .text(`${m.documentA}: ${m.valueA}  →  ${m.documentB}: ${m.valueB}`, 70, doc.y, { width: PAGE_WIDTH - 30 });
          doc.fillColor('#64748b').fontSize(9)
            .text(m.description, 70, doc.y, { width: PAGE_WIDTH - 30 });
          doc.moveDown(0.3);
        });
      } else {
        doc.fillColor('#16a34a').fontSize(10).font('Helvetica')
          .text('✅ No mismatches detected. All documents are consistent.', 60, doc.y);
      }

      doc.moveDown(1);

      // ─── Warnings ────────────────────────────────
      if (reportData.warnings && reportData.warnings.length > 0) {
        sectionTitle(doc, `Warnings (${reportData.warnings.length})`);
        reportData.warnings.forEach((w) => {
          if (doc.y > 700) doc.addPage();
          doc.fillColor('#d97706').fontSize(10).font('Helvetica-Bold')
            .text(`[${w.severity}] ${w.type} — ${w.document}`, 60, doc.y);
          doc.fillColor('#374151').fontSize(9).font('Helvetica')
            .text(w.description, 70, doc.y, { width: PAGE_WIDTH - 30 });
          doc.moveDown(0.3);
        });
      }

      // ─── Fraud & Authenticity Assessment ─────────
      if (reportData.fraudAssessment) {
        const fa = reportData.fraudAssessment;
        sectionTitle(doc, 'Fraud & Authenticity Assessment');
        
        doc.fillColor(fa.isFraudulent ? '#dc2626' : '#16a34a').fontSize(12).font('Helvetica-Bold')
          .text(`Authenticity Score: ${fa.authenticityScore}% ${fa.isFraudulent ? '(CRITICAL FORGERY RISK)' : '(Genuine)'}`, 50, doc.y);
        doc.moveDown(0.5);

        doc.fillColor('#374151').fontSize(10).font('Helvetica')
          .text(fa.fraudAnalysis, 50, doc.y, { width: PAGE_WIDTH });
        
        if (fa.primaryRiskFactor && fa.primaryRiskFactor !== 'None') {
          doc.moveDown(0.3);
          doc.fillColor('#ea580c').fontSize(9).font('Helvetica-Bold')
            .text(`Primary Risk Factor: `, 50, doc.y, { continued: true })
            .font('Helvetica').text(fa.primaryRiskFactor);
        }
        
        doc.moveDown(1.5);
      }

      // ─── Extracted Data Summary ───────────────────
      if (reportData.extractedDocuments && reportData.extractedDocuments.length > 0) {
        doc.addPage();
        sectionTitle(doc, 'Extracted Document Data');

        reportData.extractedDocuments.forEach((d) => {
          if (doc.y > 680) doc.addPage();
          doc.fillColor('#1e40af').fontSize(12).font('Helvetica-Bold')
            .text(d.documentType || 'Unknown Document', 50, doc.y);
          doc.moveDown(0.3);

          const keyFields = [
            ['Invoice Number', d.data?.invoice_number],
            ['Invoice Date', d.data?.invoice_date],
            ['Exporter', d.data?.exporter?.name],
            ['Importer', d.data?.importer?.name],
            ['Country of Origin', d.data?.country_of_origin],
            ['Destination', d.data?.country_of_destination],
            ['Port of Loading', d.data?.port_of_loading],
            ['Port of Discharge', d.data?.port_of_discharge],
            ['Container No.', d.data?.container_number],
            ['Currency', d.data?.currency],
            ['Total Value', d.data?.total_invoice_value],
            ['Gross Weight', `${d.data?.gross_weight || ''} ${d.data?.gross_weight_unit || ''}`],
            ['Net Weight', `${d.data?.net_weight || ''} ${d.data?.net_weight_unit || ''}`],
            ['Packages', d.data?.packages],
            ['Incoterms', d.data?.incoterms],
          ];

          keyFields.forEach(([label, value]) => {
            if (value && String(value).trim() && String(value).trim() !== ' ') {
              if (doc.y > 700) doc.addPage();
              doc.fillColor('#6b7280').fontSize(9).font('Helvetica-Bold')
                .text(`${label}: `, 60, doc.y, { continued: true });
              doc.fillColor('#111827').font('Helvetica')
                .text(String(value), { width: PAGE_WIDTH - 20 });
            }
          });

          // Line items
          if (d.data?.items && d.data.items.length > 0) {
            doc.moveDown(0.3);
            doc.fillColor('#374151').fontSize(10).font('Helvetica-Bold').text('Line Items:', 60, doc.y);
            d.data.items.forEach((item, idx) => {
              if (doc.y > 700) doc.addPage();
              doc.fillColor('#4b5563').fontSize(9).font('Helvetica')
                .text(`  ${idx + 1}. ${item.description || 'N/A'} | Qty: ${item.quantity || 'N/A'} ${item.unit || ''} | HS: ${item.hs_code || 'N/A'} | Amount: ${item.currency || ''} ${item.amount || 'N/A'}`,
                  70, doc.y, { width: PAGE_WIDTH - 30 });
            });
          }

          doc.moveDown(1);
        });
      }

      // ─── Add Footer to All Pages ────────────────────
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor('#9ca3af')
          .text('This report was generated by an AI-assisted document review tool. It is intended to support, not replace, review by a qualified customs professional, and does not guarantee regulatory compliance. Fields marked as low-confidence should be manually verified before filing.',
            50, doc.page.height - 70, { width: PAGE_WIDTH, align: 'center' });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Render a section title
 */
const sectionTitle = (doc, title) => {
  doc.fillColor('#1e293b').rect(50, doc.y, doc.page.width - 100, 22).fill();
  doc.fillColor('#e2e8f0').fontSize(11).font('Helvetica-Bold')
    .text(title, 55, doc.y - 18);
  doc.moveDown(0.8);
};

module.exports = { generatePDFReport };
