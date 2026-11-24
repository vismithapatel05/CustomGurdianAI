const path = require('path');
const { extractDocuments } = require('./controllers/extractController');

async function run() {
  const req = {
    body: {
      sessionId: 'test-session-123',
      files: [
        { filename: 'MATCH-01_Invoice.pdf', originalName: 'MATCH-01_Invoice.pdf' },
        { filename: 'MATCH-01_PackingList.pdf', originalName: 'MATCH-01_PackingList.pdf' },
        { filename: 'MATCH-01_CertificateOfOrigin.pdf', originalName: 'MATCH-01_CertificateOfOrigin.pdf' }
      ]
    }
  };
  const res = {
    json: (data) => console.log('FINAL JSON:', JSON.stringify(data, null, 2)),
    status: (code) => ({ json: (d) => console.log(code, d) })
  };
  const next = (err) => console.error(err);
  
  await extractDocuments(req, res, next);
}

run();
