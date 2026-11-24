import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 120000, // 2 minutes for Gemini AI calls
});

// Request interceptor
api.interceptors.request.use((config) => {
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error || error.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);

/**
 * Upload multiple files
 * @param {File[]} files
 * @param {string} sessionId
 * @param {Function} onProgress
 */
export const uploadFiles = async (files, sessionId = null, onProgress = null) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  if (sessionId) formData.append('sessionId', sessionId);

  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    },
  });
};

/**
 * Start async validation job
 * @param {string} sessionId
 * @param {Array} files
 * @param {string|null} expectedHsCode
 */
export const startValidation = async (sessionId, files, expectedHsCode = null) => {
  return api.post('/validation/start', { sessionId, files, expectedHsCode });
};

/**
 * Poll validation job status
 * @param {string} sessionId
 */
export const pollValidationStatus = async (sessionId) => {
  return api.get(`/validation/${sessionId}/status`);
};

/**
 * Generate and download PDF report
 * @param {Object} reportData
 */
export const generateReport = async (reportData) => {
  const response = await axios.post('/api/report', reportData, {
    responseType: 'blob',
    timeout: 60000,
  });

  // Create download link
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CustomsGuardian_Report_${Date.now()}.pdf`;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);

  return true;
};

/**
 * Get session history
 */
export const getHistory = async () => {
  return api.get('/history');
};

/**
 * Health check
 */
export const healthCheck = async () => {
  return api.get('/health');
};

export default api;
