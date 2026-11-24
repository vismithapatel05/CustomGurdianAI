const { validateDocuments } = require('./services/validationService');
const { calculateRiskScore } = require('./services/riskService');

const extractedDocs = [
  {
    documentType: 'COMMERCIAL_INVOICE',
    extractionStatus: 'SUCCESS',
    extractedData: {
      set_reference: 'MATCH-01',
      invoice_number: 'INV-2026001',
      invoice_date: '2026-07-20',
      exporter: { name: 'Lotus Homeware Co., Ltd.' },
      importer: { name: 'Northbridge Trading LLC' },
      consignee: { name: 'Northbridge Trading LLC' },
      country_of_origin: 'Vietnam',
      total_invoice_value: '8880.00',
      currency: 'USD',
      items: [
        {
          description: 'Ceramic Coffee Mugs, glazed, 350ml',
          hs_code: '6912.00',
          quantity: 4800,
          unit: 'pcs',
          unit_price: 1.85,
          amount: 8880.00
        }
      ]
    }
  },
  {
    documentType: 'PACKING_LIST',
    extractionStatus: 'SUCCESS',
    extractedData: {
      set_reference: 'MATCH-01',
      related_invoice_number: 'INV-2026001',
      exporter: { name: 'Lotus Homeware Co., Ltd.' },
      importer: { name: 'Northbridge Trading LLC' },
      consignee: { name: 'Northbridge Trading LLC' },
      items: [
        {
          description: 'Ceramic Coffee Mugs, glazed, 350ml',
          quantity: 4800,
          unit: 'pcs'
        }
      ]
    }
  },
  {
    documentType: 'CERTIFICATE_OF_ORIGIN',
    extractionStatus: 'SUCCESS',
    extractedData: {
      set_reference: 'MATCH-01',
      certificate_number: 'COO-2026001',
      exporter: { name: 'Lotus Homeware Co., Ltd.' },
      importer: { name: 'Northbridge Trading LLC' },
      consignee: { name: 'Northbridge Trading LLC' },
      country_of_origin: 'Vietnam',
      items: [
        {
          description: 'Ceramic Coffee Mugs, glazed, 350ml',
          hs_code: '6912.00',
          quantity: 4800,
          unit: 'pcs'
        }
      ]
    }
  }
];

const result = validateDocuments(extractedDocs);
const risk = calculateRiskScore(result.mismatches, result.warnings);

console.log(JSON.stringify({ ...result, risk }, null, 2));
