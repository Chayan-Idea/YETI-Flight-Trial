import { Octokit } from "@octokit/rest";

const owner = process.env.GITHUB_OWNER;
const repo = process.env.GITHUB_REPO;
const branch = process.env.GITHUB_BRANCH || "feature/document-library-v1";

export function githubConfig() {
  if (!process.env.GITHUB_TOKEN || !owner || !repo) throw new Error("GitHub storage is not configured.");
  return { owner, repo, branch };
}
export function githubClient() {
  if (!process.env.GITHUB_TOKEN) throw new Error("GitHub storage token is not configured.");
  return new Octokit({ auth: process.env.GITHUB_TOKEN });
}
export type LibraryDocument = {
  id: string; title: string; category: string; fileName: string; path: string;
  size: number; uploadedAt: string; uploadedBy: string;
};
export const CATEGORIES = ["Flight Trial","Safety & Assurance","Checklists","Test Reports","Engineering","Other"] as const;
const catalogPath = "documents/catalog.json";

export async function readCatalog(): Promise<LibraryDocument[]> {
  const { owner, repo, branch } = githubConfig();
  try {
    const response = await githubClient().repos.getContent({ owner, repo, path: catalogPath, ref: branch });
    if (Array.isArray(response.data) || response.data.type !== "file" || !("content" in response.data)) return [];
    const parsed: unknown = JSON.parse(Buffer.from(response.data.content, "base64").toString("utf8"));
    return Array.isArray(parsed) ? parsed as LibraryDocument[] : [];
  } catch (error) {
    if ((error as { status?: number }).status === 404) return [];
    throw error;
  }
}
export async function writeCatalog(items: LibraryDocument[]) {
  const { owner, repo, branch } = githubConfig();
  const octokit = githubClient();
  let sha: string | undefined;
  try {
    const current = await octokit.repos.getContent({ owner, repo, path: catalogPath, ref: branch });
    if (!Array.isArray(current.data) && current.data.type === "file" && "sha" in current.data) sha = current.data.sha;
  } catch (error) { if ((error as { status?: number }).status !== 404) throw error; }
  await octokit.repos.createOrUpdateFileContents({
    owner, repo, path: catalogPath, message: "docs: update document catalog", branch,
    content: Buffer.from(JSON.stringify(items, null, 2) + "\n").toString("base64"),
    ...(sha ? { sha } : {})
  });
}
export function safeFileName(name: string) {
  return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "document";
}
