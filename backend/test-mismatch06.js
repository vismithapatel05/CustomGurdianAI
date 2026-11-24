const { compareDocuments } = require('./controllers/compareController');

const req = {
  body: {
    sessionId: 'test-06',
    extractedDocs: [
      {
        filename: 'MISMATCH-06_Invoice.pdf',
        documentType: 'Commercial Invoice',
        data: {
          set_reference: 'MISMATCH-06',
          invoice_number: 'INV-3000',
          exporter: { name: 'Acme Corp' },
          importer: { name: 'Globex' },
          total_invoice_value: '18768.00',
          items: [
            {
              description: 'Polyester Woven Backpacks, 25L',
              hs_code: '4202.92',
              quantity: 3200,
              unit_price: 5.10,
              amount: 18768.00
            }
          ]
        }
      }
    ]
  }
};

const res = {
  status: function(code) { this.statusCode = code; return this; },
  json: function(data) { console.log('Response:', JSON.stringify(data, null, 2)); }
};

compareDocuments(req, res, console.error);
