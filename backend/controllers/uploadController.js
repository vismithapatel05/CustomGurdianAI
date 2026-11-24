const path = require('path');
const { getFileSizeMB, sanitizeFilename } = require('../utils/fileUtils');
const logger = require('../utils/logger');

// In-memory session store (replace with MongoDB if needed)
const sessions = {};

/**
 * POST /api/upload
 * Accepts multiple files via multipart/form-data
 */
const uploadFiles = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    const { v4: uuidv4 } = require('uuid');
    const sessionId = req.body.sessionId || uuidv4();

    const uploadedFiles = req.files.map((file) => ({
      fileId: path.basename(file.filename, path.extname(file.filename)),
      filename: file.filename,
      originalName: sanitizeFilename(file.originalname),
      mimetype: file.mimetype,
      size: file.size,
      sizeMB: getFileSizeMB(file.path),
      path: file.path,
      uploadedAt: new Date().toISOString(),
    }));

    // Store in session
    if (!sessions[sessionId]) {
      sessions[sessionId] = { uploadedFiles: [], extractedDocs: [], validationResult: null };
    }
    sessions[sessionId].uploadedFiles.push(...uploadedFiles);

    logger.info(`[Upload] ${uploadedFiles.length} files uploaded for session ${sessionId}`);

    res.json({
      success: true,
      sessionId,
      files: uploadedFiles,
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadFiles, sessions };
