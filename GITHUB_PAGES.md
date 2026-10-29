# GitHub Pages static edition

This repository contains a static public edition in `docs/`. It is designed for GitHub Pages and does not require Node.js, Vercel, a server, or environment secrets.

## What works
- Responsive document index
- Search across title, filename, category and description
- Category filters
- Open published documents through links configured in `docs/catalog.json`

## Important limitations
- This is a public static site, not a private document portal.
- There is no login, allowlist enforcement, server-side API, secure upload, or protected PDF delivery.
- Anyone can read files committed to a public repository or served by Pages. Only add documents that are approved for public release.
- Do not add tokens, OAuth secrets, credentials, restricted flight-test material, or sensitive operational information to this repository.
- To publish a PDF, place an approved public PDF in `docs/files/` and add an entry to `docs/catalog.json`, for example:
  ```json
  {
    "documents": [
      {
        "title": "Approved checklist",
        "filename": "approved-checklist.pdf",
        "category": "Checklist",
        "description": "Public release copy",
        "path": "files/approved-checklist.pdf"
      }
    ]
  }
  ```
  Keep the catalog valid JSON and ensure the file exists.

## Enable Pages
1. Make the repository public in GitHub repository Settings → General → Danger Zone → Change repository visibility.
2. Open Settings → Pages.
3. Under Build and deployment, select **GitHub Actions** as the source.
4. Merge the reviewed static-site changes to `main` only after explicit approval.
5. The workflow deploys the contents of `docs/`. The expected URL is `https://chayan-idea.github.io/YETI-Flight-Trial/` after Pages is enabled and a successful deployment completes.

The original Next.js server application is retained separately in the repository for reference; GitHub Pages serves only the static `docs/` directory.