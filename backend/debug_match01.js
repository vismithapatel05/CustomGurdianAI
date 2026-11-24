const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '.env') });
const { extractDocuments } = require('./controllers/extractController');

const files = [
  { filename: 'MATCH-01_Invoice.pdf', originalName: 'MATCH-01_Invoice.pdf' },
  { filename: 'MATCH-01_PackingList.pdf', originalName: 'MATCH-01_PackingList.pdf' },
  { filename: 'MATCH-01_CertificateOfOrigin.pdf', originalName: 'MATCH-01_CertificateOfOrigin.pdf' }
];

const req = {
  body: {
    sessionId: 'debug-session',
    files
  }
};

const res = {
  json: (data) => {
    console.log("=== FINAL RESPONSE ===");
    data.results.forEach(doc => {
      console.log(`\nFILE: ${doc.fileName}`);
      console.log(`TYPE: ${doc.documentType}`);
      console.log(`EXTRACTION_STATUS: ${doc.extractionStatus}`);
      console.log(`EXTRACTION_ERROR: (See console logs above if FAILED)`);
      console.log(`EXTRACTED_DATA: ${JSON.stringify(doc.extractedData, null, 2)}`);
    });
  },
  status: (code) => {
    return {
      json: (data) => console.log('Error status:', code, data)
    };
  }
};

const next = (err) => {
  console.error('Express Error:', err);
};

extractDocuments(req, res, next).then(() => {
  console.log('\nDEBUG COMPLETE');
});
