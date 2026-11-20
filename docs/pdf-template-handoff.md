# YETI PDF-driven checklist template handoff

## How to provide a revised PDF

There are two supported handoff routes:

1. Attach the PDF in the ChatGPT conversation and identify it as the new 01B Daily Airworthiness master.
2. Commit one or more PDFs into `template-inbox/` in this repository. The GitHub Actions workflow analyses every new or modified PDF and publishes a review-only JSON artifact. For a single existing inbox file, the workflow can also be run manually with its repository path.

The operator-facing webpage does not expose a master-PDF upload control. Operators only see the approved checklist questions and normal evidence/signature inputs.

## From PDF to live checklist

1. **Intake:** validate the PDF header, file path, page count, dimensions and SHA-256. Reject unreadable or encrypted PDFs safely.
2. **Extraction:** capture page text, positioned text lines, numbered checkpoint candidates, section-heading candidates, bounding boxes and duplicate IDs. The workflow also builds a coordinate-free review package from unambiguous numbered points.
3. **Template preparation:** the inbox workflow generates a review-only package candidate (`*-package.candidate.json`) grouping numbered points under detected section headings. ChatGPT/reviewer checks exact wording, grouping, multi-line descriptions and stable IDs against the original pages. Duplicate IDs or PDFs without extractable text fail closed. The package is never approved automatically.
4. **Package validation:** validate package schema, unique checkpoint IDs, source checksum and page geometry. If the new PDF has no reviewed status/signature cell coordinates, use `signatureMode: "append-signature-page"`: the source PDF remains unchanged and the signature is placed on a clearly labelled appended page. Existing mapped templates continue to overlay their mapped signature cell.
5. **Approval:** only a package explicitly marked `activation.status: "approved"` can be activated. A candidate cannot be activated, even if a caller tries to bypass the review flag.
6. **Publication:** publish the immutable source PDF and its package under a new versioned path, then update `js/daily-airworthiness-pdf-manifest.js` to point to that package.
7. **Runtime:** the webpage fetches the approved package, verifies the source PDF checksum, and renders the extracted sections as the 01B interaction checklist.
8. **Replacement:** a newly approved version replaces the active PDF/template identity. The old daily answers, remarks, trial metadata, signature and daily photo evidence are cleared from the active browser session. Loading-Unloading state remains separate. The old source/package can remain versioned in GitHub for audit and rollback; it is no longer used by the live checklist.
9. **Preview/export:** preview and export render the exact uploaded source PDF pages without redrawing them. A reviewed signature-cell mapping overlays the signature in place; otherwise a labelled Checker / Reviewer signature page is appended. Daily photo evidence is appended on matching-size evidence page(s), four photos per page. Checklist statuses, remarks and trial metadata are deliberately excluded from the original source pages.
10. **Fail closed:** if the approved source PDF cannot be fetched, checksum-verified, rendered or exported, the app reports an error and does not silently substitute the legacy HTML document.

## Important boundary

A PDF attachment in ChatGPT is not directly visible to GitHub Pages. The controlled handoff is ChatGPT analysis followed by publication of the PDF asset and package into this repository. A PDF added directly to `template-inbox/` automatically produces an extraction artifact, but the final checklist wording and coordinate map still require visual review before package approval. This is intentional for flight-safety documentation.

## Versioned package contents

See `schemas/pdf-template-package.schema.json`. Store each immutable source PDF and package under a distinct template/version path. The package must contain the source SHA-256, page dimensions, checklist sections, stable checkpoint IDs, and explicit coordinate mappings. Do not overwrite an already published version path with different PDF bytes.
\n\n## Review package generation\n\nThe PDF candidate workflow now emits both the extraction JSON and a `*-package.candidate.json` artifact. The package contains detected numbered checkpoint IDs, their extracted descriptions and section-heading candidates, the source checksum, page geometry, and `signatureMode: append-signature-page`. Review the artifact before publication; correct OCR/text extraction issues and section grouping manually where necessary. The candidate must remain `activation.status: candidate` until a human approves it. After approval, publish the source PDF and package under an immutable versioned asset path and update the active manifest URL.\n