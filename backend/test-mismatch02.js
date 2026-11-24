const { validateDocuments } = require('./services/validationService');

// Simulating MISMATCH-02 extraction
const extractedDocs = [
  {
    documentType: 'Commercial Invoice',
    data: {
      set_reference: 'MISMATCH-02',
      invoice_number: 'INV-2027001',
      exporter: { name: 'Indus Weave Textiles Pvt. Ltd.' },
      importer: { name: 'Meadowlark Home Goods Inc.' },
      items: [
        {
          description: 'Cotton Bath Towels, 500 GSM, white',
          hs_code: '6302.60',
          quantity: 2000,
          amount: 5000.00
        }
      ]
    }
  },
  {
    documentType: 'Certificate of Origin',
    data: {
      set_reference: 'MISMATCH-02',
      exporter: { name: 'Indus Weave Textiles Pvt. Ltd.' },
      importer: { name: 'Meadowlark Home Goods Inc.' },
      items: [
        {
          description: 'Cotton Bath Towels, 500 GSM, white',
          hs_code: '8471.30',
          quantity: 2000,
          amount: 5000.00
        }
      ]
    }
  }
];

const result = validateDocuments(extractedDocs);
const complianceStatus = result.mismatches.length > 0 ? 'NON_COMPLIANT' : 'COMPLIANT';
console.log(`\nFinal compliance status: ${complianceStatus}`);
console.log('\nMismatches detected:');
console.log(JSON.stringify(result.mismatches, null, 2));
