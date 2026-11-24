const fs = require('fs');

async function test() {
  try {
    const mupdf = await import('mupdf');
    const pdfData = fs.readFileSync('uploads/1d321886-93b2-4c4e-a735-2985149c79df.pdf');
    const doc = mupdf.Document.openDocument(pdfData, 'application/pdf');
    const page = doc.loadPage(0);
    const pixmap = page.toPixmap(mupdf.Matrix.scale(2, 2), mupdf.ColorSpace.DeviceRGB, false);
    const pngData = pixmap.asPNG();
    fs.writeFileSync('test-output.png', pngData);
    console.log('Success!');
  } catch (err) {
    console.error('Failed:', err);
  }
}
test();
