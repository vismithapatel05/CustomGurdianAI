const path = require('path');
const fs = require('fs');

/**
 * Determine if a file is an image by extension
 */
const isImage = (filepath) => {
  const imageExts = ['.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.webp', '.gif'];
  return imageExts.includes(path.extname(filepath).toLowerCase());
};

/**
 * Determine if a file is a PDF by extension
 */
const isPDF = (filepath) => {
  return path.extname(filepath).toLowerCase() === '.pdf';
};

/**
 * Delete a file safely (no error if not found)
 */
const deleteFile = (filepath) => {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (err) {
    console.warn(`[fileUtils] Could not delete ${filepath}: ${err.message}`);
  }
};

/**
 * Get file size in MB
 */
const getFileSizeMB = (filepath) => {
  try {
    const stats = fs.statSync(filepath);
    return (stats.size / (1024 * 1024)).toFixed(2);
  } catch {
    return '0';
  }
};

/**
 * Sanitize original filename for display
 */
const sanitizeFilename = (filename) => {
  return path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
};

module.exports = { isImage, isPDF, deleteFile, getFileSizeMB, sanitizeFilename };
