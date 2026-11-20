# YETI PDF-driven checklist template handoff

## Operator workflow

The operator attaches the revised master PDF in the ChatGPT conversation. The webpage does not request the master file from the operator.

ChatGPT prepares a versioned template package from that attachment and publishes it to this repository. The published package contains:

- The original PDF under `assets/templates/<template-id>/source.pdf`
- `package.json` matching `schemas/pdf-template-package.schema.json`
- The extracted checklist sections and stable checkpoint IDs
- Page dimensions and per-field coordinate mappings
- SHA-256 of the exact source PDF
- An explicit `activation.status` value

The active package URL is set in `js/daily-airworthiness-pdf-manifest.js` as `window.YETI_DAILY_AIRWORTHINESS_PDF_PACKAGE_URL`.

## Validation and activation

1. The PDF candidate workflow extracts page geometry, text and checkpoint candidates.
2. ChatGPT checks section hierarchy, checkpoint order, duplicate/missing IDs, response types and coordinates against the actual pages.
3. The package loader verifies the source PDF signature and SHA-256.
4. The template registry validates every checkpoint mapping and page bound.
5. The source-PDF overlay preview and exported PDF are visually checked.
6. Only a package with `activation.status: "approved"` is loaded as active.
7. Failed validation leaves the previously working checklist active.

## Important boundary

A PDF attachment in ChatGPT is not directly visible to GitHub Pages. The controlled handoff is ChatGPT analysis followed by publication of the PDF asset and package into this repository. The deployed webpage then fetches the approved package. No operator-facing PDF upload control is required.

## Package contents

See `schemas/pdf-template-package.schema.json`. The source PDF must be committed as a binary repository asset and its SHA-256 must match the package. Candidate extraction is advisory: OCR/text extraction does not independently approve flight-safety checklist wording or mappings.
