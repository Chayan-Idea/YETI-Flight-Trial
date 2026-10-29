import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CATEGORIES, githubClient, githubConfig, readCatalog, safeFileName, writeCatalog } from "@/lib/github";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BYTES = 20 * 1024 * 1024;

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ session: { authenticated: false }, documents: [] }, { headers: { "Cache-Control": "no-store" } });
  try {
    const documents = await readCatalog();
    return NextResponse.json({
      session: { authenticated: true, user: { name: session.user.name, image: session.user.image, githubLogin: session.user.githubLogin } },
      documents: documents.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Library read failed", error);
    return NextResponse.json({ error: "Could not read the private document catalog. Check server GitHub token permissions." }, { status: 500 });
  }
}
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.githubLogin) return NextResponse.json({ error: "Sign in with an authorized GitHub account to upload documents." }, { status: 401 });
  try {
    const form = await request.formData();
    const title = String(form.get("title") || "").trim();
    const category = String(form.get("category") || "");
    const file = form.get("file");
    if (!title || title.length > 120) return NextResponse.json({ error: "Enter a title between 1 and 120 characters." }, { status: 400 });
    if (!CATEGORIES.includes(category as typeof CATEGORIES[number])) return NextResponse.json({ error: "Choose a valid category." }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a PDF file to upload." }, { status: 400 });
    if (file.size < 1 || file.size > MAX_BYTES) return NextResponse.json({ error: "PDF must be between 1 byte and 20 MB." }, { status: 400 });
    if (!file.name.toLowerCase().endsWith(".pdf") || (file.type && file.type !== "application/pdf")) return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 400 });
    const { owner, repo, branch } = githubConfig();
    const octokit = githubClient();
    const id = crypto.randomUUID();
    const fileName = safeFileName(file.name.replace(/\.pdf$/i, "")) + ".pdf";
    const path = `documents/files/${id}-${fileName}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await octokit.repos.createOrUpdateFileContents({ owner, repo, path, branch, message: `docs: add ${title.replace(/[\r\n]/g, " ").slice(0, 70)}`, content: bytes.toString("base64") });
    const current = await readCatalog();
    current.push({ id, title, category, fileName: file.name, path, size: file.size, uploadedAt: new Date().toISOString(), uploadedBy: session.user.githubLogin });
    await writeCatalog(current);
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    console.error("PDF upload failed", error);
    return NextResponse.json({ error: "Upload failed. Check GitHub token permissions and branch configuration, then try again." }, { status: 500 });
  }
}
