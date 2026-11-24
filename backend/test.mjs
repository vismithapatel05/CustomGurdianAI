import fs from 'fs';
import * as mupdf from 'mupdf';
const doc = mupdf.Document.openDocument(fs.readFileSync('uploads/MATCH-01_CertificateOfOrigin.pdf'), 'application/pdf');
const page = doc.loadPage(0);
const pixmap = page.toPixmap(mupdf.Matrix.identity, mupdf.ColorSpace.DeviceRGB, false);
fs.writeFileSync('test.png', pixmap.asPNG());
console.log('success');
