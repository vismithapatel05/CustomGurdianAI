const { compareDocuments } = require('./controllers/compareController');

const req = {
  body: {
    sessionId: 'test-05',
    extractedDocs: [
      {
        filename: 'MISMATCH-05_Invoice.pdf',
        documentType: 'Unknown',
        error: 'Extraction failed'
      },
      {
        filename: 'MISMATCH-05_PackingList.pdf',
        documentType: 'Packing List',
        data: {
          set_reference: 'MISMATCH-05',
          exporter: { name: 'Acme Corp' }
        }
      },
      {
        filename: 'MISMATCH-05_CertificateOfOrigin.pdf',
        documentType: 'Unknown',
        error: 'Extraction failed'
      }
    ]
  }
};

const res = {
  status: function(code) { this.statusCode = code; return this; },
  json: function(data) { console.log('Response:', JSON.stringify(data, null, 2)); }
};

compareDocuments(req, res, console.error);
