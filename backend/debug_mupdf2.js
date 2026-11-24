const path = require('path');

const run = async () => {
  try {
    const mupdf = await import('mupdf');
    const filepath = path.join(__dirname, 'uploads', '1133ca16-815f-4dca-93d1-95de2d63d22c.pdf');
    console.log(`Loading PDF with mupdf: ${filepath}`);
    const doc = new mupdf.Document(filepath);
    console.log(`Page count: ${doc.countPages()}`);
  } catch (e) {
    console.log(`mupdf failed: ${e.message}`);
  }
};
run();
