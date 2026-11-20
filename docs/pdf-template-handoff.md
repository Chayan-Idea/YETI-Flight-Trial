# YETI PDF-driven checklist template handoff

## How to provide a revised PDF

There are two supported handoff routes:

1. Attach the PDF in the ChatGPT conversation and identify it as the new 01B Daily Airworthiness master.
2. Commit one or more PDFs into `template-inbox/` in this repository. The GitHub Actions workflow analyses every new or modified PDF and publishes a review-only JSON artifact. For a single existing inbox file, the workflow can also be run manually with its repository path.

The operator-facing webpage does not expose a master-PDF upload control. Operators only see the approved checklist questions and normal evidence/signature inputs.

## From PDF to live checklist

1. **Intake:** validate the PDF header, file path, page count, dimensions and SHA-256. Reject unreadable or encrypted PDFs safely.
2. **Extraction:** capture page text, positioned text lines, numbered checkpoint candidates, bounding boxes and duplicate IDs.
3. **Template preparation:** ChatGPT reviews the actual PDF page layout and produces the versioned package. Checklist wording, section hierarchy, stable IDs, response fields and coordinates are checked against the source. The extraction artifact is advisory and never activates a checklist by itself.
4. **Package validation:** validate package schema, unique checkpoint IDs, source checksum, page geometry and every required checkpoint coordinate.
5. **Approval:** only a package explicitly marked `activation.status: "approved"` can be activated. A candidate cannot be activated, even if a caller tries to bypass the review flag.
6. **Publication:** publish the immutable source PDF and its package under a new versioned path, then update `js/daily-airworthiness-pdf-manifest.js` to point to that package.
7. **Runtime:** the webpage fetches the approved package, verifies the source PDF checksum, and renders the extracted sections as the 01B interaction checklist.
8. **Replacement:** a newly approved version replaces the active PDF/template identity. The old daily answers, remarks, trial metadata, signature and daily photo evidence are cleared from the active browser session. Loading-Unloading state remains separate. The old source/package can remain versioned in GitHub for audit and rollback; it is no longer used by the live checklist.
9. **Preview/export:** preview and export use the exact uploaded source PDF as the background. Only the saved Checker + Reviewer signature is overlaid on the original pages. Daily photo evidence is appended on A4 landscape evidence page(s), four photos per page. Checklist statuses, remarks and trial metadata are deliberately excluded from this PDF.
10. **Fail closed:** if the approved source PDF cannot be fetched, checksum-verified, rendered or exported, the app reports an error and does not silently substitute the legacy HTML document.

## Important boundary

A PDF attachment in ChatGPT is not directly visible to GitHub Pages. The controlled handoff is ChatGPT analysis followed by publication of the PDF asset and package into this repository. A PDF added directly to `template-inbox/` automatically produces an extraction artifact, but the final checklist wording and coordinate map still require visual review before package approval. This is intentional for flight-safety documentation.

## Versioned package contents

See `schemas/pdf-template-package.schema.json`. Store each immutable source PDF and package under a distinct template/version path. The package must contain the source SHA-256, page dimensions, checklist sections, stable checkpoint IDs, and explicit coordinate mappings. Do not overwrite an already published version path with different PDF bytes.
