import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { githubClient, githubConfig, readCatalog } from "@/lib/github";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in to access this document." }, { status: 401 });
  const { id } = await context.params;
  try {
    const docs = await readCatalog();
    const doc = docs.find((item) => item.id === id);
    if (!doc || !doc.path.startsWith("documents/files/") || !doc.path.toLowerCase().endsWith(".pdf")) return NextResponse.json({ error: "Document not found." }, { status: 404 });
    const { owner, repo, branch } = githubConfig();
    const result = await githubClient().repos.getContent({ owner, repo, path: doc.path, ref: branch });
    if (Array.isArray(result.data) || result.data.type !== "file" || !("content" in result.data)) return NextResponse.json({ error: "Document file is unavailable." }, { status: 404 });
    const bytes = Buffer.from(result.data.content, "base64");
    const inline = new URL(request.url).searchParams.get("mode") === "inline";
    const safeName = doc.fileName.replace(/[\r\n"]/g, "_");
    return new NextResponse(bytes, { headers: {
      "Content-Type": "application/pdf", "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeName}"`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"
    }});
  } catch (error) {
    console.error("PDF retrieval failed", error);
    return NextResponse.json({ error: "Could not retrieve this PDF from private GitHub storage." }, { status: 500 });
  }
}
