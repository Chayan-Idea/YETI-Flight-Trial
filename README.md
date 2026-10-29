# YETI Flight Trial Document Library

Private, mobile-friendly document library for authorized YETI Flight Trial team members.

## Version 1 features
- GitHub OAuth sign-in with an explicit GitHub username allowlist.
- PDF uploads with title and category metadata.
- Search by title, filename, uploader and category.
- Category filters and document counts.
- Authenticated PDF preview and download through server routes.
- PDFs and catalog stored in the private GitHub repository.
- Responsive layout and installable PWA manifest.

## Technology
- Next.js App Router, React and TypeScript
- Auth.js GitHub provider
- Octokit for private repository storage

## Local setup
1. Install Node.js 20.9+.
2. Copy `.env.example` to `.env.local`.
3. Create a GitHub OAuth App. Set its callback URL to `http://localhost:3000/api/auth/callback/github`.
4. Set `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` and a strong random `AUTH_SECRET`.
5. Create a GitHub token with Contents read/write access to the private `Chayan-Idea/YETI-Flight-Trial` repository. Set it as `GITHUB_TOKEN`.
6. Set `AUTHORIZED_GITHUB_USERS` to a comma-separated list of approved GitHub usernames.
7. Keep `GITHUB_BRANCH=feature/document-library-v1` for this development branch.
8. Run `npm install`, then `npm run dev`.

## Required environment variables
See `.env.example`. Never commit `.env.local` or expose `GITHUB_TOKEN` in browser code.

## Storage layout
- `documents/catalog.json` — document metadata
- `documents/files/` — uploaded PDFs (created automatically by the first upload)

## Security notes
- All library and document API routes require an authenticated session.
- Sign-in is denied unless the GitHub username is on the allowlist.
- GitHub storage credentials are used server-side only.
- Do not deploy until OAuth callback URLs, allowed usernames, token permissions and environment variables have been reviewed.
- Each upload creates a GitHub commit for the PDF and a separate catalog update. Monitor failed uploads and remove orphaned files if needed.

## Deploy
Deploy the feature branch to a private preview environment after setting all required environment variables. Configure the production OAuth callback URL to match the deployment domain. Review repository access and deployment visibility before inviting users.
