# PDF template inbox

This folder is the repository handoff target for new 01B Daily Airworthiness master PDFs. Do not ask flight operators to upload master PDFs in the webpage.

## Intake

1. Add the exact PDF to this folder and commit it to `main`. The same file may first be reviewed in a ChatGPT conversation; a ChatGPT attachment must still be placed in this repository inbox before GitHub Pages can serve it.
2. The **YETI PDF Template Candidate Analysis** workflow runs automatically and publishes a review-only extraction artifact.
3. Inspect every extracted checkpoint ID, description, section heading, numbering gap and source page against the original PDF. Resolve missing/merged wording and any scanned pages before approval.
4. After review, open **Actions → YETI 2-Minute Quick Quality Check → Run workflow** on `main`.
5. Set `pdf_path` to the exact inbox path, set `approve_activation` to true, enter `approved_by`, and provide `approval_reference` (review PR, controlled document reference or equivalent).
6. The single consolidated quality-check job re-extracts and validates the PDF, creates an immutable versioned source/package, updates the active pointer and service-worker cache version, runs the full quick gate, commits the release and deploys GitHub Pages only if every check passes.

## Safety rules

- Uploading a PDF alone never activates it.
- Approval is an explicit human release decision. Do not set `approve_activation=true` until the candidate has been compared with the rendered source.
- Duplicate checkpoint IDs, empty descriptions, unreadable PDFs, missing source assets, checksum mismatches and failed quality checks block publication.
- Missing serial numbers are reported, never invented. Confirm intentional gaps before approval.
- Published source PDFs and packages are immutable and versioned. The active pointer changes; older versions remain available for audit/rollback.
- PDFs with no reviewed signature-cell map use a clearly labelled appended signature page. The original source pages remain unchanged; daily photos are appended by the renderer.
- Scanned/image-only PDFs require a separate OCR/manual preparation step; the automatic publisher fails closed when no usable checkpoint text is extracted.
