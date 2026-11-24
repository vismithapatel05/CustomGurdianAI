const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

const files = [
  '1133ca16-815f-4dca-93d1-95de2d63d22c.pdf',
  '1a2a9e28-16b5-47da-b603-7c8dbe59060b.pdf',
  '5c9242aa-c892-4a7a-b37e-50b916e87ea2.pdf'
];

const run = async () => {
  for (const file of files) {
    const filepath = path.join(__dirname, 'uploads', file);
    const dataBuffer = fs.readFileSync(filepath);
    
    console.log(`\n============================`);
    console.log(`File: ${file}`);
    console.log(`file size in bytes: ${fs.statSync(filepath).size}`);
    console.log(`buffer size in bytes: ${dataBuffer.length}`);
    
    try {
      const data = await pdfParse(dataBuffer);
      console.log(`PDF page count: ${data.numpages}`);
      const text = data.text ? data.text.trim() : '';
      console.log(`pdf-parse raw text length: ${text.length}`);
      console.log(`first 200 characters: \n${text.substring(0, 200)}\n`);
    } catch (e) {
      console.log(`pdf-parse failed: ${e.message}`);
    }
  }
};

run();
