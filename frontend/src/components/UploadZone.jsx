import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUploadCloud, FiFile, FiImage, FiX, FiCheckCircle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const FILE_ICONS = {
  'application/pdf': { icon: FiFile, color: '#f87171', label: 'PDF' },
  'image/png': { icon: FiImage, color: '#60a5fa', label: 'PNG' },
  'image/jpeg': { icon: FiImage, color: '#60a5fa', label: 'JPG' },
  'image/jpg': { icon: FiImage, color: '#60a5fa', label: 'JPG' },
};

const MAX_FILES = 20;
const MAX_SIZE_MB = 25;

export default function UploadZone({ files, setFiles, hsCode, setHsCode, onValidate, isProcessing }) {
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach((rej) => {
        const err = rej.errors[0]?.message || 'File rejected';
        toast.error(`${rej.file.name}: ${err}`);
      });
    }

    const newFiles = acceptedFiles.filter(
      (f) => !files.some((existing) => existing.name === f.name && existing.size === f.size)
    );

    if (files.length + newFiles.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    setFiles((prev) => [...prev, ...newFiles]);
    if (newFiles.length > 0) {
      toast.success(`${newFiles.length} file(s) added`);
    }
  }, [files, setFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    maxSize: MAX_SIZE_MB * 1024 * 1024,
    disabled: isProcessing,
  });

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        id="upload-dropzone"
        className={`upload-zone cursor-pointer p-8 text-center transition-all select-none ${
          isDragActive ? 'drag-active' : ''
        } ${isProcessing ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
      >
        <input {...getInputProps()} id="file-input" />

        <motion.div
          animate={{ y: isDragActive ? -8 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            animate={{ scale: isDragActive ? 1.1 : 1 }}
            className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-600/20 border border-blue-500/20 flex items-center justify-center"
          >
            <FiUploadCloud className="text-3xl text-blue-400" />
          </motion.div>

          {isDragActive ? (
            <p className="text-blue-400 font-semibold text-lg">Drop your files here</p>
          ) : (
            <>
              <p className="text-white font-semibold text-lg mb-1">
                Drag & drop documents here
              </p>
              <p className="text-slate-400 text-sm mb-4">
                or <span className="text-blue-400 font-medium">click to browse</span>
              </p>
            </>
          )}

          <div className="flex flex-wrap justify-center gap-2 mt-3">
            {['PDF', 'PNG', 'JPG', 'JPEG'].map((ext) => (
              <span
                key={ext}
                className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-medium border border-slate-700"
              >
                {ext}
              </span>
            ))}
          </div>
          <p className="text-slate-500 text-xs mt-3">Max {MAX_FILES} files · {MAX_SIZE_MB}MB per file</p>
        </motion.div>
      </div>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between px-1">
              <p className="text-sm text-slate-400 font-medium">{files.length} file(s) selected</p>
              {!isProcessing && (
                <button
                  onClick={() => setFiles([])}
                  className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            {files.map((file, index) => {
              const fileInfo = FILE_ICONS[file.type] || { icon: FiFile, color: '#94a3b8', label: 'FILE' };
              const Icon = fileInfo.icon;

              return (
                <motion.div
                  key={`${file.name}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:border-slate-600 transition-all"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${fileInfo.color}20` }}
                  >
                    <Icon style={{ color: fileInfo.color }} className="text-base" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate font-medium">{file.name}</p>
                    <p className="text-xs text-slate-500">
                      {fileInfo.label} · {formatSize(file.size)}
                    </p>
                  </div>

                  {!isProcessing && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1 flex-shrink-0"
                      id={`remove-file-${index}`}
                    >
                      <FiX />
                    </button>
                  )}
                </motion.div>
              );
            })}

            {/* Expected HS Code Input */}
            {!isProcessing && files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4"
              >
                <label htmlFor="hsCode" className="block text-sm font-medium text-slate-300 mb-1">
                  Expected HS Code (Optional)
                </label>
                <input
                  type="text"
                  id="hsCode"
                  value={hsCode || ''}
                  onChange={(e) => setHsCode(e.target.value)}
                  placeholder="e.g. 8517.12.00"
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  disabled={isProcessing}
                />
              </motion.div>
            )}

            {/* Validate Button */}
            {!isProcessing && files.length > 0 && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={onValidate}
                id="validate-btn"
                className="w-full btn-primary mt-4 py-4 text-base font-semibold flex items-center justify-center gap-2"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <FiCheckCircle className="text-xl" />
                Validate {files.length} Document{files.length > 1 ? 's' : ''} with AI
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
