const logger = require('../utils/logger');

const SEVERITY = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  INFO: 'Info',
};

const unwrapValue = (obj) => {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === 'object' && 'value' in obj) {
    return obj.value;
  }
  return obj;
};

const getConfidence = (obj) => {
  if (obj && typeof obj === 'object' && 'confidence' in obj) {
    return obj.confidence;
  }
  return null;
};

const getExtractionStatus = (obj) => {
  if (obj && typeof obj === 'object' && 'status' in obj) {
    return obj.status;
  }
  return null;
};

const normalizeString = (str) => {
  const val = unwrapValue(str);
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (s === '') return null;
  const lower = s.toLowerCase();
  
  const BAD_LABELS = [
    'company name', 'importer name', 'buyer name', 'exporter name',
    'invoice number', 'invoice no', 'hs code', 'country of origin',
    'buyer', 'seller', 'importer', 'exporter', 'consignee', 'required', 'missing', 'unknown',
    'invoice #', 'hs-code', 'harmonized system code', 'origin country', 'invoice reference'
  ];
  if (BAD_LABELS.includes(lower)) return null;
  return s;
};

const normalizeNumber = (val) => {
  const unwrapped = unwrapValue(val);
  if (unwrapped === null || unwrapped === undefined) return null;
  const str = String(unwrapped);
  const num = parseFloat(str.replace(/[^0-9.-]+/g, ''));
  if (isNaN(num)) return null;
  return num;
};

const normalizeHsCode = (val) => {
  const unwrapped = unwrapValue(val);
  if (unwrapped === null || unwrapped === undefined) return null;
  let str = String(unwrapped).trim();
  str = str.replace(/\s+/g, '');
  str = str.replace(/-/g, '');
  if (str.endsWith('.00')) {
    str = str.slice(0, -3);
  }
  return str;
};

const getNormalizedImporter = (data) => {
  if (!data) return null;
  const name = unwrapValue(data.importer?.name) || unwrapValue(data.buyer?.name) || unwrapValue(data.consignee?.name) || null;
  return normalizeString(name);
};

const getNormalizedExporter = (data) => {
  if (!data) return null;
  const name = unwrapValue(data.exporter?.name) || unwrapValue(data.seller?.name) || unwrapValue(data.manufacturer?.name) || null;
  return normalizeString(name);
};

const createFinding = (type, severity, documentA, documentB, field, valueA, valueB, status, explanation) => ({
  id: `finding-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
  type,
  severity,
  documentA,
  documentB,
  field,
  valueA: valueA ?? 'null',
  valueB: valueB ?? 'null',
  status, // 'MATCH', 'MISMATCH', 'MISSING', 'NEEDS_REVIEW'
  explanation,
  timestamp: new Date().toISOString()
});

const isMissing = (val) => {
  const unwrapped = unwrapValue(val);
  if (unwrapped === null || unwrapped === undefined) return true;
  const str = String(unwrapped).trim().toLowerCase();
  if (str === '' || str === 'null' || str === 'n/a' || str === 'na' || str === 'not available' || str === 'not applicable') {
    return true;
  }
  return false;
};

const validateDocuments = (extractedDocs, expectedHsCode = null) => {
  const findings = [];
  const extractionIssues = [];
  const warnings = [];
  const comparisonsPerformed = [];

  if (!extractedDocs || extractedDocs.length === 0) {
    return { findings, warnings, comparisonsPerformed, extractionIssues };
  }

  // Build Canonical Data Model
  const canonicalDocs = {};
  
  extractedDocs.forEach(doc => {
    const type = doc.documentType; 
    if (!type || type === 'UNKNOWN') return;
    
    const normDoc = { 
      fileName: doc.fileName,
      extractionStatus: doc.extractionStatus,
      normalizedData: {}
    };
    
    const data = doc.extractedData || {};
    
    if (type === 'COMMERCIAL_INVOICE') {
      normDoc.normalizedData = {
        importer_name: getNormalizedImporter(data),
        exporter_name: getNormalizedExporter(data),
        invoice_number: normalizeString(data.invoice_number || data.related_invoice_number),
        total_invoice_value: normalizeNumber(data.total_invoice_value),
        subtotal: normalizeNumber(data.subtotal),
        country_of_origin: normalizeString(data.country_of_origin),
        invoice_date: normalizeString(data.invoice_date),
        items: (data.items || []).map(i => ({
          description: normalizeString(i.description),
          quantity: normalizeNumber(i.quantity),
          unit_price: normalizeNumber(i.unit_price),
          line_amount: normalizeNumber(i.amount),
          hs_code: normalizeString(i.hs_code)
        }))
      };
    } else if (type === 'PACKING_LIST') {
      normDoc.normalizedData = {
        importer_name: getNormalizedImporter(data),
        exporter_name: getNormalizedExporter(data),
        invoice_number: normalizeString(data.invoice_number || data.related_invoice_number),
        country_of_origin: normalizeString(data.country_of_origin),
        gross_weight: normalizeNumber(data.gross_weight),
        net_weight: normalizeNumber(data.net_weight),
        items: (data.items || []).map(i => ({
          description: normalizeString(i.description),
          quantity: normalizeNumber(i.quantity),
          hs_code: normalizeString(i.hs_code)
        }))
      };
    } else if (type === 'CERTIFICATE_OF_ORIGIN') {
      normDoc.normalizedData = {
        importer_name: getNormalizedImporter(data),
        exporter_name: getNormalizedExporter(data),
        invoice_number: normalizeString(data.invoice_number || data.related_invoice_number),
        country_of_origin: normalizeString(data.country_of_origin),
        certificate_number: normalizeString(data.certificate_number),
        items: (data.items || []).map(i => ({
          description: normalizeString(i.description),
          quantity: normalizeNumber(i.quantity),
          hs_code: normalizeString(i.hs_code)
        }))
      };
    }
    
    doc.normalizedData = normDoc.normalizedData;
    canonicalDocs[type] = normDoc;
  });

  let missingRequiredDoc = false;
  const failedDocs = extractedDocs.filter(d => d.extractionStatus === 'FAILED' || d.documentType === 'UNKNOWN');
  
  ['COMMERCIAL_INVOICE', 'PACKING_LIST', 'CERTIFICATE_OF_ORIGIN'].forEach(reqType => {
    const docMeta = canonicalDocs[reqType];
    
    if (docMeta && (docMeta.extractionStatus === 'SUCCESS' || docMeta.extractionStatus === 'PARTIAL')) {
       if (docMeta.extractionStatus === 'PARTIAL') {
         extractionIssues.push({
           documentType: reqType,
           status: 'PARTIAL',
           severity: 'MEDIUM',
           message: `${reqType.replace('_', ' ')} was partially extracted. Some optional fields may be missing.`
         });
       }
    } else if (docMeta && docMeta.extractionStatus === 'FAILED') {
      missingRequiredDoc = true;
      extractionIssues.push({
        documentType: reqType,
        status: 'FAILED',
        severity: 'HIGH',
        message: `Unable to reliably extract structured data from ${reqType.replace('_', ' ')}.`
      });
    } else if (failedDocs.length > 0) {
      missingRequiredDoc = true;
      extractionIssues.push({
        documentType: reqType,
        status: 'FAILED',
        severity: 'HIGH',
        message: `A document was uploaded that failed extraction, which may be the missing ${reqType.replace('_', ' ')}.`
      });
    } else {
      missingRequiredDoc = true;
      extractionIssues.push({
        documentType: reqType,
        status: 'FAILED',
        severity: 'HIGH',
        message: `Required document was not uploaded: ${reqType.replace('_', ' ')}`
      });
    }
  });

  if (missingRequiredDoc) {
    logger.info(`[Validation] Missing or failed required documents. Skipping cross-doc and math validation.`);
    return { findings, warnings, comparisonsPerformed, extractionIssues };
  }

  const ci = canonicalDocs['COMMERCIAL_INVOICE']?.normalizedData;
  const pl = canonicalDocs['PACKING_LIST']?.normalizedData;
  const coo = canonicalDocs['CERTIFICATE_OF_ORIGIN']?.normalizedData;

  // Math Validation (Deterministic)
  if (ci) {
    let calculatedTotal = 0;
    if (ci.items && ci.items.length > 0) {
      ci.items.forEach(item => {
        const q = item.quantity || 0;
        const up = item.unit_price || 0;
        const lineAmt = item.line_amount || 0;
        
        if (q > 0 && up > 0 && lineAmt > 0) {
          const calcLine = q * up;
          const diff = Math.abs(calcLine - lineAmt);
          if (diff > 0.01) {
            findings.push(createFinding(
              'MATHEMATICAL_INCONSISTENCY', SEVERITY.CRITICAL, 'COMMERCIAL_INVOICE', 'Calculated Amount', 'line_amount', calcLine, lineAmt, 'MISMATCH',
              `Quantity ${q} × unit price ${up} = ${calcLine.toFixed(2)}, but declared line amount is ${lineAmt.toFixed(2)}.`
            ));
          }
        }
        
        calculatedTotal += (lineAmt > 0 ? lineAmt : (q * up));
      });
    }

    if (ci.total_invoice_value && calculatedTotal > 0) {
      const diffTotal = Math.abs(calculatedTotal - ci.total_invoice_value);
      if (diffTotal / ci.total_invoice_value > 0.05) {
        findings.push(createFinding(
          'MATHEMATICAL_INCONSISTENCY', SEVERITY.CRITICAL, 'COMMERCIAL_INVOICE', 'Calculated Total', 'total_invoice_value', calculatedTotal, ci.total_invoice_value, 'MISMATCH',
          `Line items sum to ${calculatedTotal.toFixed(2)}, but stated total is ${ci.total_invoice_value.toFixed(2)}. Requires review.`
        ));
      }
    }
  }

  const REQUIRED_FIELDS = ['invoice_number', 'country_of_origin', 'total_invoice_value', 'hs_code', 'quantity'];

  const crossCheckStr = (field, nameA, valA, nameB, valB, mismatchSeverity) => {
    comparisonsPerformed.push(`${nameA} vs ${nameB}: ${field}`);
    const missingA = isMissing(valA);
    const missingB = isMissing(valB);

    if (missingA && missingB) {
      // Both missing. Check if it's required.
      if (REQUIRED_FIELDS.includes(field)) {
         findings.push(createFinding(
          'MISSING_FIELD', SEVERITY.CRITICAL, nameA, nameB, field, unwrapValue(valA), unwrapValue(valB), 'MISSING',
          `${field.replace(/_/g, ' ')} is missing in BOTH documents and is a REQUIRED field.`
        ));
      }
      return;
    } else if (missingA || missingB) {
      const isRequired = REQUIRED_FIELDS.includes(field);
      findings.push(createFinding(
        'MISSING_FIELD', isRequired ? SEVERITY.CRITICAL : SEVERITY.INFO, nameA, nameB, field, unwrapValue(valA), unwrapValue(valB), 'MISSING',
        `${field.replace(/_/g, ' ')} is missing in one of the documents and cannot be verified.${isRequired ? ' This is a REQUIRED field.' : ''}`
      ));
      return;
    }

    const a = String(valA).toLowerCase();
    const b = String(valB).toLowerCase();
    
    if (a !== b) {
      findings.push(createFinding(
        'CROSS_DOCUMENT_MISMATCH', mismatchSeverity, nameA, nameB, field, unwrapValue(valA), unwrapValue(valB), 'MISMATCH',
        `${field.replace(/_/g, ' ')} mismatch between ${nameA} and ${nameB}.`
      ));
    } else {
      findings.push(createFinding(
        'CROSS_DOCUMENT_MATCH', SEVERITY.INFO, nameA, nameB, field, unwrapValue(valA), unwrapValue(valB), 'MATCH',
        `${field.replace(/_/g, ' ')} matches between ${nameA} and ${nameB}.`
      ));
    }
  };

  crossCheckStr('invoice_number', 'COMMERCIAL_INVOICE', ci.invoice_number, 'PACKING_LIST', pl.invoice_number, SEVERITY.HIGH);
  crossCheckStr('importer_name', 'COMMERCIAL_INVOICE', ci.importer_name, 'PACKING_LIST', pl.importer_name, SEVERITY.MEDIUM);
  crossCheckStr('country_of_origin', 'COMMERCIAL_INVOICE', ci.country_of_origin, 'PACKING_LIST', pl.country_of_origin, SEVERITY.CRITICAL);

  crossCheckStr('invoice_number', 'COMMERCIAL_INVOICE', ci.invoice_number, 'CERTIFICATE_OF_ORIGIN', coo.invoice_number, SEVERITY.HIGH);
  crossCheckStr('importer_name', 'COMMERCIAL_INVOICE', ci.importer_name, 'CERTIFICATE_OF_ORIGIN', coo.importer_name, SEVERITY.MEDIUM);
  crossCheckStr('country_of_origin', 'COMMERCIAL_INVOICE', ci.country_of_origin, 'CERTIFICATE_OF_ORIGIN', coo.country_of_origin, SEVERITY.CRITICAL);

  crossCheckStr('importer_name', 'PACKING_LIST', pl.importer_name, 'CERTIFICATE_OF_ORIGIN', coo.importer_name, SEVERITY.MEDIUM);
  crossCheckStr('country_of_origin', 'PACKING_LIST', pl.country_of_origin, 'CERTIFICATE_OF_ORIGIN', coo.country_of_origin, SEVERITY.CRITICAL);

  const crossCheckItems = (nameA, itemsA, nameB, itemsB) => {
    if (!itemsA || !itemsB) return;
    const mapA = {};
    itemsA.forEach(i => {
      const desc = String(i.description || 'unknown').toLowerCase();
      if (!mapA[desc]) mapA[desc] = { quantity: 0, hs_code: i.hs_code };
      mapA[desc].quantity += i.quantity || 0;
      if (i.hs_code) mapA[desc].hs_code = i.hs_code;
    });

    const mapB = {};
    itemsB.forEach(i => {
      const desc = String(i.description || 'unknown').toLowerCase();
      if (!mapB[desc]) mapB[desc] = { quantity: 0, hs_code: i.hs_code };
      mapB[desc].quantity += i.quantity || 0;
      if (i.hs_code) mapB[desc].hs_code = i.hs_code;
    });

    Object.keys(mapA).forEach(key => {
      if (mapB[key]) {
        comparisonsPerformed.push(`${nameA} vs ${nameB}: quantity`);
        if (mapA[key].quantity > 0 && mapB[key].quantity > 0 && Math.abs(mapA[key].quantity - mapB[key].quantity) > 0.01) {
          findings.push(createFinding(
            'CROSS_DOCUMENT_MISMATCH', SEVERITY.HIGH, nameA, nameB, `quantity (${key})`, mapA[key].quantity, mapB[key].quantity, 'MISMATCH',
            `Quantity mismatch for item "${key}" between ${nameA} and ${nameB}.`
          ));
        }

        comparisonsPerformed.push(`${nameA} vs ${nameB}: hs_code`);
        const missingA = isMissing(mapA[key].hs_code);
        const missingB = isMissing(mapB[key].hs_code);
        
        if (missingA && missingB) {
           if (REQUIRED_FIELDS.includes('hs_code')) {
             findings.push(createFinding(
              'MISSING_FIELD', SEVERITY.CRITICAL, nameA, nameB, `hs_code (${key})`, unwrapValue(mapA[key].hs_code), unwrapValue(mapB[key].hs_code), 'MISSING',
              `HS Code for item "${key}" is missing in BOTH documents and is a REQUIRED field.`
             ));
           }
        } else if (missingA || missingB) {
          const isRequired = REQUIRED_FIELDS.includes('hs_code');
          findings.push(createFinding(
            'MISSING_FIELD', isRequired ? SEVERITY.CRITICAL : SEVERITY.INFO, nameA, nameB, `hs_code (${key})`, unwrapValue(mapA[key].hs_code), unwrapValue(mapB[key].hs_code), 'MISSING',
            `HS Code for item "${key}" is missing in one of the documents and cannot be verified.${isRequired ? ' This is a REQUIRED field.' : ''}`
          ));
        } else {
          const normA = normalizeHsCode(mapA[key].hs_code);
          const normB = normalizeHsCode(mapB[key].hs_code);
          if (normA !== normB) {
            findings.push(createFinding(
              'CROSS_DOCUMENT_MISMATCH', SEVERITY.CRITICAL, nameA, nameB, `hs_code (${key})`, unwrapValue(mapA[key].hs_code), unwrapValue(mapB[key].hs_code), 'MISMATCH',
              `HS Code mismatch for item "${key}" between ${nameA} and ${nameB}.`
            ));
          } else {
             findings.push(createFinding(
              'CROSS_DOCUMENT_MATCH', SEVERITY.INFO, nameA, nameB, `hs_code (${key})`, unwrapValue(mapA[key].hs_code), unwrapValue(mapB[key].hs_code), 'MATCH',
              `HS Code for item "${key}" matches between ${nameA} and ${nameB}.`
            ));
          }
        }
      }
    });
  };

  crossCheckItems('COMMERCIAL_INVOICE', ci.items, 'PACKING_LIST', pl.items);
  crossCheckItems('COMMERCIAL_INVOICE', ci.items, 'CERTIFICATE_OF_ORIGIN', coo.items);
  crossCheckItems('PACKING_LIST', pl.items, 'CERTIFICATE_OF_ORIGIN', coo.items);

  if (expectedHsCode) {
    const normExpected = normalizeHsCode(expectedHsCode);
    if (normExpected) {
      comparisonsPerformed.push(`Expected HS Code validation`);
      
      const checkExpectedHsCode = (name, items) => {
        if (!items) return;
        items.forEach((i, idx) => {
          if (!isMissing(i.hs_code)) {
            const normExtracted = normalizeHsCode(i.hs_code);
            if (normExtracted !== normExpected) {
              findings.push(createFinding(
                'EXPECTED_HS_CODE_MISMATCH', SEVERITY.HIGH, name, 'Expected Database', `hs_code (item ${idx + 1}: ${i.description || 'unknown'})`, unwrapValue(i.hs_code), expectedHsCode, 'MISMATCH',
                `Extracted HS code for item "${i.description || 'unknown'}" (${unwrapValue(i.hs_code)}) does not match the expected HS code (${expectedHsCode}).`
              ));
            }
          }
        });
      };

      checkExpectedHsCode('COMMERCIAL_INVOICE', ci?.items);
      checkExpectedHsCode('PACKING_LIST', pl?.items);
      checkExpectedHsCode('CERTIFICATE_OF_ORIGIN', coo?.items);
    }
  }

  return { findings, warnings, comparisonsPerformed, extractionIssues };
};

module.exports = { validateDocuments };
