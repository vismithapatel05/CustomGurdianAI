const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const logger = require('../utils/logger');
const { isImage, isPDF } = require('../utils/fileUtils');

/**
 * Preprocess image for better OCR accuracy (upscale, grayscale, binarize)
 */
const preprocessImage = async (filepath) => {
  const dir = path.dirname(filepath);
  const ext = path.extname(filepath);
  const basename = path.basename(filepath, ext);
  const processedPath = path.join(dir, `${basename}_processed${ext}`);

  try {
    logger.info(`[OCR] Preprocessing image: ${basename}${ext}`);
    
    // Using sharp to grayscale, resize (upscale by 2x), and apply threshold
    await sharp(filepath)
      .resize({ width: 2000, withoutEnlargement: false }) // upscale for better OCR reading
      .grayscale()
      .normalize()
      .threshold(150) // binarize
      .toFile(processedPath);

    return processedPath;
  } catch (err) {
    logger.warn(`[OCR] Image preprocessing failed: ${err.message}. Using original image.`);
    return filepath; // fallback to original
  }
};

/**
 * Extract text from a PDF file using pdf-parse.
 * Falls back to mupdf + Tesseract OCR if text is too short (scanned PDF).
 */
const extractTextFromPDF = async (filepath) => {
  try {
    const pdfParse = require('pdf-parse');
    const dataBuffer = fs.readFileSync(filepath);
    const data = await pdfParse(dataBuffer);
    const text = data.text ? data.text.trim() : '';
    logger.info(`[OCR] PDF parsed: ${text.length} chars from ${path.basename(filepath)}`);
    console.log(`\n${path.basename(filepath)}:\nbuffer = ${(dataBuffer.length / 1024).toFixed(2)}kb\npages = ${data.numpages}\ntext length = ${text.length}\npreview = "${text.substring(0, 300).replace(/\n/g, ' ')}"\n`);
    // If text is suspiciously short, the PDF may be a scanned image
    if (text.length < 100) {
      logger.info(`[OCR] PDF text too short (${text.length} chars) for ${path.basename(filepath)}. Attempting OCR fallback...`);
      return await extractTextFromPDFWithOCR(filepath, text.length);
    }

    return { text, method: 'pdf-parse', pdfCharCount: text.length, ocrCharCount: 0 };
  } catch (err) {
    logger.error(`[OCR] pdf-parse failed: ${err.message}. Attempting OCR fallback...`);
    return await extractTextFromPDFWithOCR(filepath, 0);
  }
};

/**
 * OCR a PDF by converting it to image first using mupdf, then running Tesseract.
 */
const extractTextFromPDFWithOCR = async (filepath, pdfCharCount) => {
  try {
    const mupdf = await import('mupdf');
    const Tesseract = require('tesseract.js');
    
    logger.info(`[OCR] Rendering PDF to images for OCR: ${path.basename(filepath)}`);
    const doc = mupdf.Document.openDocument(fs.readFileSync(filepath), "application/pdf");
    const pageCount = doc.countPages();
    
    let combinedText = '';
    
    for (let i = 0; i < pageCount; i++) {
      const page = doc.loadPage(i);
      // Scale by 2 for better OCR resolution
      const pixmap = page.toPixmap(mupdf.Matrix.scale(2, 2), mupdf.ColorSpace.DeviceRGB, false);
      
      const tempImagePath = `${filepath}_page${i}.png`;
      fs.writeFileSync(tempImagePath, pixmap.asPNG());
      
      logger.info(`[OCR] Running Tesseract on page ${i + 1}/${pageCount}`);
      const { data: { text } } = await Tesseract.recognize(tempImagePath, 'eng');
      combinedText += text + '\n\n';
      
      if (fs.existsSync(tempImagePath)) {
        fs.unlinkSync(tempImagePath);
      }
    }
    
    const cleanedText = combinedText.trim();
    logger.info(`[OCR] PDF OCR extracted: ${cleanedText.length} chars from ${path.basename(filepath)}`);
    return { text: cleanedText, method: 'pdf-ocr', pdfCharCount, ocrCharCount: cleanedText.length };
  } catch (err) {
    logger.error(`[OCR] OCR fallback failed for PDF: ${err.message}`);
    return { text: '', method: 'ocr-failed', pdfCharCount, ocrCharCount: 0 };
  }
};

/**
 * Extract text from an image file using Tesseract.js.
 */
const extractTextFromImage = async (filepath, shouldPreprocess = true) => {
  try {
    const Tesseract = require('tesseract.js');
    let targetFile = filepath;

    if (shouldPreprocess) {
      targetFile = await preprocessImage(filepath);
    }

    logger.info(`[OCR] Running Tesseract on ${path.basename(targetFile)}`);

    const { data: { text } } = await Tesseract.recognize(targetFile, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          logger.debug(`[Tesseract] Progress: ${(m.progress * 100).toFixed(0)}%`);
        }
      },
    });

    // Cleanup processed file if it was created
    if (shouldPreprocess && targetFile !== filepath && fs.existsSync(targetFile)) {
      fs.unlinkSync(targetFile);
    }

    const cleanedText = text.trim();
    logger.info(`[OCR] Tesseract extracted: ${cleanedText.length} chars from ${path.basename(filepath)}`);
    return { text: cleanedText, method: 'tesseract-ocr', pdfCharCount: 0, ocrCharCount: cleanedText.length };
  } catch (err) {
    logger.error(`[OCR] Tesseract failed: ${err.message}`);
    return { text: '', method: 'ocr-failed', pdfCharCount: 0, ocrCharCount: 0 };
  }
};

/**
 * Master extraction entry point.
 * Auto-detects file type and routes to appropriate extractor.
 */
const extractText = async (filepath) => {
  if (isPDF(filepath)) {
    return await extractTextFromPDF(filepath);
  } else if (isImage(filepath)) {
    return await extractTextFromImage(filepath, true);
  } else {
    logger.warn(`[OCR] Unknown file type for: ${filepath}`);
    return { text: '', method: 'unsupported' };
  }
};

module.exports = { extractText, extractTextFromPDF, extractTextFromImage };
