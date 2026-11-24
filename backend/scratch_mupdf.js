const mupdf = require('mupdf');
const fs = require('fs');
const path = require('path');

const testPdf = async () => {
    try {
        console.log("mupdf exports:", Object.keys(mupdf));
        
        const doc = new mupdf.Document("MISMATCH-06_Invoice.pdf");
        const pageCount = doc.countPages();
        console.log("Page count:", pageCount);
        
        for (let i = 0; i < pageCount; i++) {
            const page = doc.loadPage(i);
            const pixmap = page.toPixmap(mupdf.Matrix.scale(2, 2), mupdf.ColorSpace.DeviceRGB, false);
            
            // pixmap has width, height, stride, samples, and saveAsPNG()
            console.log(`Page ${i} Pixmap: ${pixmap.getWidth()}x${pixmap.getHeight()}`);
            pixmap.saveAsPNG(`page_${i}.png`);
        }
    } catch(err) {
        console.error(err);
    }
}
testPdf();
