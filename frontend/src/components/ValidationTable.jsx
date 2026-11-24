import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiSearch } from 'react-icons/fi';

const TRACKED_FIELDS = [
  { key: 'invoice_number', label: 'Invoice Number' },
  { key: 'invoice_date', label: 'Invoice Date' },
  { key: 'exporter', label: 'Exporter', accessor: (d) => d.exporter?.name },
  { key: 'importer', label: 'Importer', accessor: (d) => d.importer?.name },
  { key: 'consignee', label: 'Consignee', accessor: (d) => d.consignee?.name },
  { key: 'country_of_origin', label: 'Country of Origin' },
  { key: 'country_of_destination', label: 'Country of Destination' },
  { key: 'port_of_loading', label: 'Port of Loading' },
  { key: 'port_of_discharge', label: 'Port of Discharge' },
  { key: 'container_number', label: 'Container Number' },
  { key: 'currency', label: 'Currency' },
  { key: 'total_invoice_value', label: 'Total Value' },
  { key: 'gross_weight', label: 'Gross Weight' },
  { key: 'net_weight', label: 'Net Weight' },
  { key: 'packages', label: 'Packages' },
  { key: 'incoterms', label: 'Incoterms' },
  { key: 'payment_terms', label: 'Payment Terms' },
  { key: 'bill_of_lading', label: 'Bill of Lading' },
  { key: 'vessel_name', label: 'Vessel Name' },
  { key: 'shipment_terms', label: 'Shipment Terms' },
];

const unwrapValue = (obj) => {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === 'object' && 'value' in obj) {
    return obj.value;
  }
  return obj;
};

const getValue = (data, field) => {
  if (!data) return null;
  if (field.accessor) return unwrapValue(field.accessor(data));
  return unwrapValue(data[field.key]);
};

const valuesEqual = (vals) => {
  const nonNull = vals.filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
  if (nonNull.length <= 1) return true;
  const first = String(nonNull[0]).toLowerCase().trim().replace(/\s+/g, ' ');
  return nonNull.every((v) => String(v).toLowerCase().trim().replace(/\s+/g, ' ') === first);
};

export default function ValidationTable({ extractedDocs }) {
  const [search, setSearch] = useState('');
  const [showMismatchOnly, setShowMismatchOnly] = useState(false);

  const validDocs = (extractedDocs || []).filter((d) => d.extractedData && d.extractionStatus !== 'FAILED');

  const filteredFields = TRACKED_FIELDS.filter((field) => {
    const matchesSearch = field.label.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (showMismatchOnly) {
      const vals = validDocs.map((d) => getValue(d.extractedData, field));
      return !valuesEqual(vals);
    }

    return true;
  });

  if (validDocs.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500">
        No extracted documents to compare
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-48 relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
          <input
            type="text"
            placeholder="Search fields..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="table-search"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => setShowMismatchOnly(!showMismatchOnly)}
            className={`w-10 h-5 rounded-full transition-colors ${showMismatchOnly ? 'bg-blue-500' : 'bg-slate-700'}`}
            id="mismatch-toggle"
          >
            <div className={`w-4 h-4 rounded-full bg-white mt-0.5 transition-transform ${showMismatchOnly ? 'translate-x-5' : 'translate-x-1'}`} />
          </div>
          <span className="text-xs text-slate-400">Mismatches only</span>
        </label>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-700/50">
        <table className="validation-table">
          <thead>
            <tr>
              <th className="w-36 sticky left-0 bg-slate-900">Field</th>
              {validDocs.map((doc, i) => (
                <th key={i} className="text-center" style={{ minWidth: 140 }}>
                  <div className="flex flex-col items-center gap-1">
                    <span className="truncate max-w-32 block" title={doc.documentType}>
                      {doc.documentType}
                    </span>
                    <span className="text-slate-600 font-normal text-xs truncate max-w-32" title={doc.fileName}>
                      {doc.fileName}
                    </span>
                  </div>
                </th>
              ))}
              <th className="text-center w-24">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredFields.map((field, fieldIdx) => {
              const vals = validDocs.map((d) => getValue(d.extractedData, field));
              const isMismatch = !valuesEqual(vals);
              const nonNullCount = vals.filter((v) => v !== null && v !== undefined && String(v).trim() !== '').length;
              const hasAny = nonNullCount > 0;
              const isMissing = hasAny && nonNullCount < vals.length && !isMismatch;

              if (!hasAny) return null;

              return (
                <motion.tr
                  key={field.key}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: fieldIdx * 0.02 }}
                  className={isMismatch ? 'bg-red-950/20' : isMissing ? 'bg-blue-950/20' : ''}
                >
                  <td className="font-medium text-slate-300 sticky left-0 bg-slate-900/80 z-10">
                    {field.label}
                  </td>
                  {vals.map((val, docIdx) => (
                    <td key={docIdx} className="text-center">
                      {val !== null && val !== undefined && String(val).trim() !== '' ? (
                        <span
                          className={`text-xs font-mono px-2 py-1 rounded-md ${
                            isMismatch
                              ? 'bg-red-500/10 text-red-300'
                              : isMissing
                              ? 'bg-blue-500/10 text-blue-300'
                              : 'bg-slate-800/80 text-slate-200'
                          }`}
                        >
                          {String(val)}
                        </span>
                      ) : (
                        <span className="text-slate-700 text-xs">—</span>
                      )}
                    </td>
                  ))}
                  <td className="text-center">
                    {isMismatch ? (
                      <span className="text-xs text-red-400 font-semibold">⚠ Mismatch</span>
                    ) : isMissing ? (
                      <span className="text-xs text-blue-400">Missing</span>
                    ) : (
                      <span className="text-xs text-green-400">✓ OK</span>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>

        {filteredFields.filter((field) => {
          const vals = validDocs.map((d) => getValue(d.extractedData, field));
          return vals.some((v) => v !== null && v !== undefined && String(v).trim() !== '');
        }).length === 0 && (
          <div className="py-8 text-center text-slate-500 text-sm">
            No fields match your filter
          </div>
        )}
      </div>
    </div>
  );
}
