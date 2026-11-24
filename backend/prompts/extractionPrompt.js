/**
 * Prompt for extracting structured JSON data from any customs document text.
 * Works semantically — no hardcoded positions or templates.
 */
const extractionPrompt = (text, documentType) => {
  let schema = '';

  const objField = `{
    "value": null,
    "confidence": 0.0,
    "source": null,
    "status": null
  }`;

  if (documentType === 'PACKING_LIST') {
    schema = `{
  "documentType": "PACKING_LIST",
  "packing_list_number": null,
  "invoice_number": ${objField},
  "related_invoice_number": ${objField},
  "date": null,
  "exporter": {
    "name": null,
    "address": null,
    "country": null
  },
  "importer": {
    "name": null,
    "address": null,
    "country": null
  },
  "packages": ${objField},
  "gross_weight": ${objField},
  "net_weight": ${objField},
  "country_of_origin": ${objField},
  "items": [
    {
      "description": null,
      "quantity": ${objField},
      "unit": null,
      "hs_code": ${objField},
      "net_weight": ${objField},
      "gross_weight": ${objField},
      "package_count": ${objField}
    }
  ]
}`;
  } else if (documentType === 'CERTIFICATE_OF_ORIGIN') {
    schema = `{
  "documentType": "CERTIFICATE_OF_ORIGIN",
  "certificate_number": null,
  "certificate_date": null,
  "invoice_number": ${objField},
  "related_invoice_number": ${objField},
  "exporter": {
    "name": null,
    "address": null,
    "country": null
  },
  "importer": {
    "name": null,
    "address": null,
    "country": null
  },
  "country_of_origin": ${objField},
  "goods_description": null,
  "hs_code": ${objField},
  "quantity": ${objField},
  "items": [
    {
      "description": null,
      "quantity": ${objField},
      "hs_code": ${objField},
      "origin_criteria": null
    }
  ]
}`;
  } else {
    // Default schema (Commercial Invoice / Generic)
    schema = `{
  "documentType": "${documentType}",
  "set_reference": null,
  "invoice_number": ${objField},
  "related_invoice_number": ${objField},
  "invoice_date": null,
  "proforma_invoice": null,
  "packing_list_number": null,
  "certificate_number": null,
  "bill_of_lading": null,
  "letter_of_credit": null,
  "po_number": null,
  "exporter": {
    "name": null,
    "address": null,
    "country": null,
    "tax_id": null,
    "contact": null
  },
  "importer": {
    "name": null,
    "address": null,
    "country": null,
    "tax_id": null,
    "contact": null
  },
  "buyer": {
    "name": null,
    "address": null
  },
  "seller": {
    "name": null,
    "address": null
  },
  "manufacturer": {
    "name": null,
    "address": null,
    "country": null
  },
  "consignee": {
    "name": null,
    "address": null,
    "country": null
  },
  "notify_party": {
    "name": null,
    "address": null
  },
  "country_of_origin": ${objField},
  "country_of_destination": null,
  "port_of_loading": null,
  "port_of_discharge": null,
  "place_of_delivery": null,
  "vessel_name": null,
  "voyage_number": null,
  "container_number": ${objField},
  "seal_number": null,
  "shipping_marks": null,
  "currency": null,
  "exchange_rate": null,
  "subtotal": null,
  "total_value": null,
  "total_invoice_value": ${objField},
  "insurance": null,
  "insurance_value": null,
  "freight": null,
  "freight_value": null,
  "cif_value": null,
  "fob_value": null,
  "gross_weight": ${objField},
  "gross_weight_unit": null,
  "net_weight": ${objField},
  "net_weight_unit": null,
  "packages": ${objField},
  "package_type": null,
  "volume": null,
  "volume_unit": null,
  "shipment_terms": null,
  "incoterms": null,
  "payment_terms": null,
  "payment_method": null,
  "bank_details": null,
  "special_instructions": null,
  "items": [
    {
      "line_number": null,
      "description": null,
      "hs_code": ${objField},
      "quantity": ${objField},
      "unit": null,
      "unit_price": null,
      "total_price": null,
      "currency": null,
      "amount": null,
      "gross_weight": ${objField},
      "net_weight": ${objField},
      "packages": ${objField},
      "brand": null,
      "model": null,
      "country_of_origin": ${objField},
      "marks": null
    }
  ],
  "certifications": [],
  "signatures": [],
  "additional_fields": {}
}`;
  }

  return `
You are an expert customs documentation specialist and data extraction AI. 
Your task is to extract all relevant information from the following ${documentType} document.

CRITICAL RULES:
- Return ONLY valid JSON. No markdown. No explanation. No code blocks. No comments.
- Extract every field you can find using semantic understanding.
- If a field is not present, use null. DO NOT fabricate missing values.
- For items/line items, always return an array even if there is only one item.
- Normalize all numbers to numeric types (not strings) when the schema expects a primitive number.
- For important fields formatted as objects (e.g. invoice_number, hs_code, quantity, weights), return:
  {
    "value": "...", // Or numeric if appropriate
    "confidence": 0.95, // Float between 0.0 and 1.0
    "source": "exact text from document",
    "status": "EXTRACTED" // Or "NEEDS_REVIEW" if uncertain
  }
  If the field is completely missing, return null for the object itself (i.e. "hs_code": null) rather than an object with null values.
- For HS codes: Preserve leading zeros, but remove formatting spaces/dashes (e.g. "8471.30.00" -> "84713000").
- Normalize currency (e.g. USD, EUR), weight units (e.g. KG, KGS -> KG), and quantity units.
- Do NOT invent data — only extract what is actually present in the document.
- This prompt must work on ANY document format, layout, or language variant.
- IMPORTANT: If a document (e.g. Packing List) mentions a "Related Invoice Number" or references another invoice, map it to 'related_invoice_number', NOT 'invoice_number'. Only map 'invoice_number' if this document IS the invoice.
- IMPORTANT: Be meticulous about extracting HS Codes (Harmonized System codes) from tables. They are often 6-10 digit numbers (e.g., 6912.00) in the line item descriptions or columns.
- IMPORTANT: Look for grouping or set references like "Set Reference: MATCH-01" and map it to 'set_reference'.

Document Type: ${documentType}

Full Document Text:
"""
${text}
"""

Extract and return this exact JSON structure:

${schema}
`;
};

module.exports = { extractionPrompt };

