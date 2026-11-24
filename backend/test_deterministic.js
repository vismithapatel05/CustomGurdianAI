const { compareDocuments } = require('./controllers/compareController');

const mockExtractedDocs = [
  {
    documentType: 'COMMERCIAL_INVOICE',
    extractionStatus: 'SUCCESS',
    extractedData: {
      invoice_number: 'INV-123',
      total_invoice_value: '100.00',
      items: [{ description: 'Test', quantity: 10, unit_price: 10, amount: 100, hs_code: '6912.00' }]
    }
  },
  {
    documentType: 'PACKING_LIST',
    extractionStatus: 'SUCCESS',
    extractedData: {
      invoice_number: 'INV-123',
      items: [{ description: 'Test', quantity: 10, hs_code: '6912' }]
    }
  },
  {
    documentType: 'CERTIFICATE_OF_ORIGIN',
    extractionStatus: 'SUCCESS',
    extractedData: {
      invoice_number: 'INV-123',
      items: [{ description: 'Test', quantity: 10, hs_code: '6912' }]
    }
  }
];

const req = {
  body: {
    sessionId: 'test-session',
    extractedDocs: mockExtractedDocs,
    expectedHsCode: '6912.00' // should match 6912 perfectly
  }
};

const res = {
  json: (data) => {
    console.log("=== JSON RESPONSE ===");
    console.log(JSON.stringify(data, null, 2));
  }
};

const next = (err) => {
  console.error('Error:', err);
};

console.log("Running compareDocuments...");
compareDocuments(req, res, next).then(() => {
  console.log('Test completed.');
});
