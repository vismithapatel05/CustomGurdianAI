const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

async function debug() {
  const uploadsDir = path.join(__dirname, 'uploads');
  // Find the most recently modified PDF file
  const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.pdf'));
  files.sort((a, b) => {
    return fs.statSync(path.join(uploadsDir, b)).mtimeMs - fs.statSync(path.join(uploadsDir, a)).mtimeMs;
  });
  
  if (files.length === 0) {
    console.log('No PDFs found');
    return;
  }
  
  const targetFile = files[0];
  const filepath = path.join(uploadsDir, targetFile);
  
  console.log('--- DEBUG START ---');
  console.log(`1. Uploaded file name: ${targetFile}`);
  
  const stat = fs.statSync(filepath);
  console.log(`2. Uploaded file size: ${stat.size} bytes`);
  
  // Basic mime type detection
  console.log(`3. MIME type: application/pdf (assumed by extension)`);
  
  const dataBuffer = fs.readFileSync(filepath);
  console.log(`4. PDF buffer exists: ${!!dataBuffer}`);
  console.log(`5. Number of bytes in buffer: ${dataBuffer.length}`);
  
  console.log(`6. Checking minimum text-length threshold: < 20 (in extractController.js), < 150 (in ocrService.js)`);
  
  try {
    const data = await pdfParse(dataBuffer);
    const text = data.text ? data.text.trim() : '';
    console.log(`7. Extracted text length: ${text.length}`);
    console.log(`8. Text returned by pdf-parse (first 100 chars): ${text.substring(0, 100).replace(/\n/g, '\\n')}`);
  } catch (err) {
    console.error(`Error during pdf-parse: ${err.message}`);
  }
  console.log('--- DEBUG END ---');
}

debug();
