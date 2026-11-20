#!/usr/bin/env python3
"""Publish an explicitly approved PDF as an immutable active YETI checklist version."""
import argparse
import hashlib
import json
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def run(*args):
    subprocess.run([str(a) for a in args], cwd=ROOT, check=True)

def safe(value):
    value = re.sub(r"[^A-Za-z0-9._-]+", "_", str(value)).strip("._-")
    if not value:
        raise ValueError("Could not derive a safe template identifier.")
    return value[:80]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", required=True)
    parser.add_argument("--approved-by", required=True)
    parser.add_argument("--approval-reference", required=True)
    args = parser.parse_args()

    inbox = (ROOT / "template-inbox").resolve()
    pdf = (ROOT / args.pdf).resolve()
    if not args.pdf.startswith("template-inbox/") or not pdf.is_relative_to(inbox) or pdf.suffix.lower() != ".pdf" or not pdf.is_file():
        raise ValueError("PDF must be an existing .pdf file inside template-inbox/; path traversal and external symlinks are rejected.")
    if not args.approved_by.strip() or not args.approval_reference.strip():
        raise ValueError("Named reviewer and approval reference are mandatory.")

    raw = pdf.read_bytes()
    if not raw.startswith(b"%PDF-") or len(raw) < 100:
        raise ValueError("Source file is not a valid PDF.")
    digest = hashlib.sha256(raw).hexdigest()
    work = ROOT / ".yeti-pdf-publish"
    work.mkdir(exist_ok=True)
    candidate_path = work / "candidate.json"
    package_path = work / "package.candidate.json"

    run("python", "scripts/analyze-pdf-template.py", pdf, "--output", candidate_path)
    candidate = json.loads(candidate_path.read_text(encoding="utf-8"))
    points = candidate.get("checkpointCandidates", [])
    if not points:
        raise ValueError("No checklist checkpoints were extracted. Scanned/ambiguous PDFs require manual OCR preparation.")
    ids = [str(point.get("id", "")).strip() for point in points]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate checkpoint IDs were detected. Resolve them before publication.")
    empty = [point.get("id") for point in points if point.get("id") != "9.0" and not (point.get("descriptionCandidate") or "").strip()]
    if empty:
        raise ValueError("Empty checkpoint descriptions require correction before publication: " + ", ".join(empty))

    source_stem = safe(candidate.get("documentNumber") or pdf.stem)
    template_id = source_stem
    version = "v-" + digest[:12]
    run("python", "scripts/build-pdf-review-package.py", candidate_path, pdf,
        "--template-id", template_id, "--version", version, "--output", package_path)
    package = json.loads(package_path.read_text(encoding="utf-8"))
    package["sourcePdf"]["path"] = f"assets/templates/{template_id}/{version}/{safe(pdf.stem)}.pdf"
    package["activation"] = {
        "status": "approved",
        "reviewRequired": False,
        "approvedBy": args.approved_by.strip(),
        "approvalReference": args.approval_reference.strip(),
        "approvedAt": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "sourceSha256": digest
    }
    package["extractionReview"]["reviewStatus"] = "approved"
    package["extractionReview"]["reviewedBy"] = args.approved_by.strip()
    package["extractionReview"]["approvalReference"] = args.approval_reference.strip()
    package["extractionReview"]["activationAllowed"] = True
    package["extractionReview"]["requiresHumanReview"] = False

    version_dir = ROOT / "assets" / "templates" / template_id / version
    if version_dir.exists():
        raise ValueError("This PDF version already exists. Its immutable version folder will not be overwritten.")
    version_dir.mkdir(parents=True, exist_ok=False)
    shutil.copy2(pdf, version_dir / f"{safe(pdf.stem)}.pdf")
    (version_dir / "template-package.json").write_text(json.dumps(package, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    manifest_path = ROOT / "js" / "daily-airworthiness-pdf-manifest.js"
    manifest = manifest_path.read_text(encoding="utf-8")
    url = f"./assets/templates/{template_id}/{version}/template-package.json"
    line = f'window.YETI_DAILY_AIRWORTHINESS_PDF_PACKAGE_URL="{url}";'
    manifest, count = re.subn(r'window\.YETI_DAILY_AIRWORTHINESS_PDF_PACKAGE_URL="[^"]+";', line, manifest, count=1)
    if count != 1:
        raise ValueError("Could not safely update the active PDF package pointer.")
    manifest_path.write_text(manifest, encoding="utf-8")

    sw_path = ROOT / "service-worker.js"
    sw = sw_path.read_text(encoding="utf-8")
    match = re.search(r"const CACHE='yeti-flight-trial-shell-v(\d+)';", sw)
    if not match:
        raise ValueError("Could not locate service-worker cache version.")
    next_cache = f"const CACHE='yeti-flight-trial-shell-v{int(match.group(1)) + 1}';"
    sw_path.write_text(sw[:match.start()] + next_cache + sw[match.end():], encoding="utf-8")

    print("APPROVED PDF TEMPLATE PUBLISHED")
    print("Template:", template_id)
    print("Version:", version)
    print("Sections:", len(package["sections"]))
    print("Checkpoints:", package["extractionReview"]["checkpointCount"])
    print("SHA-256:", digest)
    print("Active package:", url)
    print("Signature strategy: appended signature page unless a reviewed source cell map is added")
    print("Original PDF pages are preserved; daily photos are appended by the PDF renderer.")

if __name__ == "__main__":
    main()
