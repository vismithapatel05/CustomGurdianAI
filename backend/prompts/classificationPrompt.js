/**
 * Prompt for classifying a customs document type from extracted text.
 * Returns a single document category label.
 */
const classificationPrompt = (text) => `
You are a customs document classifier. Analyze the following document text and classify it.

Return ONLY one of the following exact values:
COMMERCIAL_INVOICE
PACKING_LIST
CERTIFICATE_OF_ORIGIN
BILL_OF_LADING
AIR_WAYBILL
PURCHASE_ORDER
INSURANCE_CERTIFICATE
UNKNOWN

Rules for Classification:
- Return ONLY a valid JSON object with a single key "documentType".
- Do not return explanations. Do not return markdown. Do not return code blocks.
- If the text is ambiguous, use "UNKNOWN".
- IMPORTANT: Use document-specific content to classify. 
  - COMMERCIAL_INVOICE strong indicators: "Commercial Invoice", "Invoice Number", "Invoice Date", "Unit Price", "Line Amount", "Subtotal", "Total Amount", "Currency", "Payment Terms".
  - PACKING_LIST strong indicators: "Packing List", "Packing Number", "Packages", "Cartons", "Net Weight", "Gross Weight", "Dimensions", "Marks & Numbers".
  - CERTIFICATE_OF_ORIGIN strong indicators: "Certificate of Origin", "Country of Origin", "Exporter", "Consignee", "Origin Criteria", "Certification Authority".
- CRITICAL: Generic fields such as "product", "quantity", "seller", and "buyer" must NOT automatically classify a document as an Invoice. A Packing List containing those fields must still be classified as PACKING_LIST if its document-specific evidence (e.g. weights, cartons) indicates that.
- CRITICAL: Do NOT use the filename to determine the document type. Rely entirely on the document text.
- CRITICAL: If the document appears to be an AI validation report, an internal dashboard export, or a "CustomsGuardian" generated report rather than an original, official trade document from a supplier/carrier, you MUST classify it as "UNKNOWN".

Document text (first 3000 chars):
"""
${text.substring(0, 3000)}
"""

Respond with ONLY this JSON format:
{
  "documentType": "<exact value from the list above>"
}
`;

module.exports = { classificationPrompt };
