# YETI PDF-driven checklist template handoff

## How to provide a revised PDF

There are two supported handoff routes:

1. Attach the PDF in the ChatGPT conversation and identify it as the new 01B Daily Airworthiness master.
2. Commit one or more PDFs into `template-inbox/` in this repository. The GitHub Actions workflow analyses every new or modified PDF and publishes a review-only JSON artifact. For a single existing inbox file, the workflow can also be run manually with its repository path.

The operator-facing webpage does not expose a master-PDF upload control. Operators only see the approved checklist questions and normal evidence/signature inputs.

## From PDF to live checklist

### Automated approval-to-activation release

1. Commit the new PDF to `template-inbox/`. The candidate-analysis workflow runs automatically and uploads the extracted JSON and review-package artifact.
2. Review the artifact against every rendered source page. Confirm checkpoint IDs, exact wording, section grouping, numbering gaps, page geometry, and whether the PDF is digitally searchable. Do not approve a partial/OCR-incomplete extraction.
3. Open **Actions → YETI 2-Minute Quick Quality Check → Run workflow** on the `main` branch.
4. Supply the repository PDF path, set **approve_activation** to true only after the document review is complete, enter the reviewer name/GitHub handle, and provide an approval reference (for example, the review PR or controlled document record).
5. The same single quality-check job re-runs extraction, rejects duplicate IDs and empty descriptions, builds an immutable versioned package, copies the original PDF into `assets/templates/<template-id>/<version>/`, updates the active package pointer, increments the service-worker cache version, and runs the existing application/module/PDF regression checks.
6. Only if the quality gate passes does the job commit the new version and active pointer to `main`. The deployment job then publishes that checked commit to GitHub Pages in the same workflow run.
7. The webpage fetches the new approved package, verifies the source PDF SHA-256, and rebuilds the 01B checklist from its extracted sections and checkpoints. The template-activation event resets the previous daily checklist answers and evidence while leaving other modules and Loading/Unloading data separate.
8. If extraction, approval metadata, checksum, package validation or any quality check fails, publication and deployment stop. The previous active template remains in production.

The workflow's approval input is a deliberate human release decision, not an automatic inference by the extractor. A reviewer must inspect the candidate artifact before entering approval details.


1. **Intake:** validate the PDF header, file path, page count, dimensions and SHA-256. Reject unreadable or encrypted PDFs safely.
2. **Extraction:** capture page text, cluster words by vertical row across separate PDF text blocks, associate row-span descriptions with serial IDs, infer section headings, and report duplicate IDs and numbering gaps. The workflow also builds a coordinate-free review package from unambiguous numbered points.
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


## Review package generation

The PDF candidate workflow now emits both the extraction JSON and a `*-package.candidate.json` artifact. The package contains detected numbered checkpoint IDs, their extracted descriptions and section-heading candidates, the source checksum, page geometry, and `signatureMode: append-signature-page`. Review the artifact before publication; correct OCR/text extraction issues and section grouping manually where necessary. The candidate must remain `activation.status: candidate` until a human approves it. After approval, publish the source PDF and package under an immutable versioned asset path and update the active manifest URL.


### Extraction limitations and review rules

The extractor handles digitally searchable PDFs with spatially associated text. It does not claim OCR support for scanned/image-only PDFs; these must be routed to manual/OCR review and cannot be activated from an empty or partial extraction. Serial-number gaps are reported (not filled), and all extracted wording remains subject to human review. A candidate package remains blocked from activation until an approved immutable source-PDF path, page geometry, signature placement, and photo-evidence policy are reviewed.
