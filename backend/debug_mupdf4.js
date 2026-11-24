const path = require('path');
const fs = require('fs');

const run = async () => {
  const mupdf = await import('mupdf');
  const filepath = path.join(__dirname, 'uploads', '1133ca16-815f-4dca-93d1-95de2d63d22c.pdf');
  const buffer = fs.readFileSync(filepath);
  
  try {
    const doc = mupdf.Document.openDocument(buffer, "application/pdf");
    console.log(`Page count: ${doc.countPages()}`);
  } catch(e) {
    console.log(`openDocument failed: ${e.message}`);
  }
};
run();
