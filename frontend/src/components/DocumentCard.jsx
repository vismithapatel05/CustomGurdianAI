import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiFileText, FiPackage, FiAward, FiAnchor, FiDollarSign,
  FiShield, FiChevronDown, FiChevronUp, FiCpu, FiCheckCircle,
  FiKey, FiExternalLink
} from 'react-icons/fi';

/**
 * Parse a raw Gemini error into a friendly short message
 */
const parseFriendlyError = (rawError) => {
  if (!rawError) return { message: 'Unknown error', isApiKeyError: false };
  const msg = String(rawError);
  if (
    msg.includes('API_KEY_INVALID') ||
    msg.includes('API key not valid') ||
    msg.includes('GEMINI_API_KEY') ||
    msg.includes('not configured')
  ) {
    return {
      message: 'Gemini API key is invalid or not configured.',
      detail: 'Add your Google AI Studio key to backend/.env as GEMINI_API_KEY.',
      link: 'https://aistudio.google.com/',
      isApiKeyError: true,
    };
  }
  // Truncate and strip raw JSON arrays from the message
  const cleaned = msg
    .replace(/\[\{.*?\}\]/gs, '')
    .replace(/Error fetching from https?:\/\/[^\s]+/g, '')
    .replace('Gemini extraction failed: ', '')
    .replace('[GoogleGenerativeAI Error]: ', '')
    .trim();
  return { message: cleaned.slice(0, 200) || 'Extraction failed', isApiKeyError: false };
};

const DOC_ICONS = {
  'Commercial Invoice': { icon: FiDollarSign, color: '#60a5fa' },
  'Packing List': { icon: FiPackage, color: '#34d399' },
  'Certificate of Origin': { icon: FiAward, color: '#f59e0b' },
  'Bill of Lading': { icon: FiAnchor, color: '#a78bfa' },
  'Proforma Invoice': { icon: FiFileText, color: '#f472b6' },
  'Insurance Certificate': { icon: FiShield, color: '#fb7185' },
  'Air Waybill': { icon: FiFileText, color: '#38bdf8' },
  'Unknown': { icon: FiFileText, color: '#6b7280' },
};

const DISPLAY_FIELDS = [
  ['Invoice No.', (d) => d.invoice_number, 'invoice_number'],
  ['Date', (d) => d.invoice_date, 'invoice_date'],
  ['Exporter', (d) => d.exporter?.name, 'exporter'], // fallback confidence on exporter
  ['Importer', (d) => d.importer?.name, 'importer'],
  ['Country of Origin', (d) => d.country_of_origin, 'country_of_origin'],
  ['Destination', (d) => d.country_of_destination, 'country_of_destination'],
  ['Currency', (d) => d.currency, 'currency'],
  ['Total Value', (d) => d.total_invoice_value, 'total_invoice_value'],
  ['Gross Weight', (d) => d.gross_weight ? `${d.gross_weight} ${d.gross_weight_unit || ''}` : null, 'gross_weight'],
  ['Net Weight', (d) => d.net_weight ? `${d.net_weight} ${d.net_weight_unit || ''}` : null, 'net_weight'],
  ['Packages', (d) => d.packages, 'packages'],
  ['Incoterms', (d) => d.incoterms, 'incoterms'],
  ['Container No.', (d) => d.container_number, 'container_number'],
  ['Port of Loading', (d) => d.port_of_loading, 'port_of_loading'],
  ['Port of Discharge', (d) => d.port_of_discharge, 'port_of_discharge'],
];

export default function DocumentCard({ doc, index }) {
  const [expanded, setExpanded] = useState(false);

  if (!doc) return null;

  const docInfo = DOC_ICONS[doc.documentType] || DOC_ICONS['Unknown'];
  const Icon = docInfo.icon;
  const hasData = doc.data && !doc.error;
  const items = doc.data?.items || [];
  const confidence = doc.confidence != null ? Math.round(doc.confidence * 100) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="glass-card overflow-hidden"
      id={`doc-card-${index}`}
    >
      {/* Card Header */}
      <div
        className="p-4 flex items-center gap-3 cursor-pointer"
        onClick={() => hasData && setExpanded(!expanded)}
      >
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${docInfo.color}15`, border: `1px solid ${docInfo.color}30` }}
        >
          <Icon style={{ color: docInfo.color }} className="text-xl" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-white">
              {doc.documentType || 'Unknown Document'}
            </h3>
            {doc.extractionStatus === 'SUCCESS' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                ✅ SUCCESS
              </span>
            )}
            {doc.extractionStatus === 'PARTIAL' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                ⚠️ PARTIAL
              </span>
            )}
            {doc.extractionStatus === 'FAILED' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                ❌ FAILED
              </span>
            )}
            {confidence != null && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: `${docInfo.color}15`,
                  color: docInfo.color,
                  border: `1px solid ${docInfo.color}30`,
                }}
              >
                {confidence}% match
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 truncate mt-0.5">{doc.originalName}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-600 flex items-center gap-1">
              <FiCpu className="text-xs" />
              {doc.ocrMethod || 'N/A'}
            </span>
            {hasData && (
              <span className="text-xs text-slate-600 flex items-center gap-1">
                <FiCheckCircle className="text-xs text-green-400" />
                {items.length} item{items.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {hasData && (
          <div className="text-slate-500 flex-shrink-0">
            {expanded ? <FiChevronUp /> : <FiChevronDown />}
          </div>
        )}
      </div>

      {/* Error State */}
      {doc.error && (() => {
        const { message, detail, link, isApiKeyError } = parseFriendlyError(doc.error);
        return (
          <div className="px-4 pb-4">
            <div className={`rounded-xl border p-3.5 ${
              isApiKeyError
                ? 'bg-amber-950/40 border-amber-800/50'
                : 'bg-red-950/40 border-red-900/50'
            }`}>
              <div className="flex items-start gap-2.5">
                {isApiKeyError
                  ? <FiKey className="text-amber-400 flex-shrink-0 mt-0.5 text-base" />
                  : <FiFileText className="text-red-400 flex-shrink-0 mt-0.5 text-base" />
                }
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold mb-0.5 ${
                    isApiKeyError ? 'text-amber-300' : 'text-red-300'
                  }`}>
                    {isApiKeyError ? 'API Key Required' : 'Extraction Failed'}
                  </p>
                  <p className={`text-xs ${
                    isApiKeyError ? 'text-amber-400/80' : 'text-red-400/80'
                  }`}>
                    {message}
                  </p>
                  {detail && (
                    <p className="text-xs text-slate-400 mt-1">{detail}</p>
                  )}
                  {link && (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 mt-1.5 underline"
                    >
                      Get free API key <FiExternalLink className="text-xs" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Expanded Fields */}
      <AnimatePresence>
        {expanded && hasData && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-slate-700/50 pt-3">
              <div className="grid grid-cols-1 gap-2">
                {DISPLAY_FIELDS.map(([label, getter, key]) => {
                  const value = getter(doc.data);
                  if (!value || String(value).trim() === '' || String(value).trim() === 'null') return null;
                  
                  const fieldConfidence = doc.confidenceScores?.[key];
                  const needsReview = fieldConfidence === 'needs_review' || fieldConfidence === 'low';
                  
                  return (
                    <div key={label} className="flex items-start gap-2 text-xs">
                      <span className="text-slate-500 w-28 flex-shrink-0">{label}</span>
                      <div className="flex items-center gap-2 flex-wrap flex-1">
                        <span className={`font-medium break-all ${needsReview ? 'text-amber-400' : 'text-slate-200'}`}>
                          {String(value)}
                        </span>
                        {needsReview && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                            Needs Review
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Line Items */}
              {items.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700/50">
                  <p className="text-xs font-semibold text-slate-400 mb-2">Line Items ({items.length})</p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {items.map((item, i) => (
                      <div key={i} className="text-xs bg-slate-800/50 rounded-lg p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-200 truncate font-medium">
                            {item.description || `Item ${i + 1}`}
                          </span>
                          {item.amount && (
                            <span className="text-green-400 flex-shrink-0">
                              {item.currency || ''} {item.amount}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-3 mt-1 text-slate-500">
                          {item.quantity && <span>Qty: {item.quantity} {item.unit || ''}</span>}
                          {item.hs_code && <span>HS: {item.hs_code}</span>}
                          {item.country_of_origin && <span>Origin: {item.country_of_origin}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
