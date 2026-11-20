#!/usr/bin/env python3
"""Extract a review-only candidate from a PDF placed in template-inbox/.
This never activates or publishes a checklist automatically.
"""
import argparse, hashlib, json, re
from pathlib import Path
import fitz

CHECKPOINT = re.compile(r"^\d+(?:\.\d+){1,2}$")

def analyse(source: Path):
    document = fitz.open(source)
    pages, checkpoints = [], []
    for page_index, page in enumerate(document):
        pages.append({
            "page": page_index + 1,
            "width": round(page.rect.width, 3),
            "height": round(page.rect.height, 3),
            "rotation": page.rotation,
            "text": page.get_text("text")
        })
        for word in page.get_text("words"):
            token = word[4].strip()
            if CHECKPOINT.fullmatch(token):
                checkpoints.append({
                    "id": token,
                    "page": page_index + 1,
                    "bbox": [round(float(value), 3) for value in word[:4]]
                })
    return {
        "candidateVersion": 1,
        "sourceFile": source.name,
        "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "pageCount": len(document),
        "pages": pages,
        "checkpointCandidates": checkpoints,
        "requiresHumanReview": True,
        "activationAllowed": False
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--output", type=Path, default=Path("template-candidate.json"))
    args = parser.parse_args()
    if not args.pdf.is_file() or args.pdf.suffix.lower() != ".pdf":
        raise SystemExit("Input must be an existing PDF file.")
    result = analyse(args.pdf)
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Analysed {result['pageCount']} pages; found {len(result['checkpointCandidates'])} checkpoint candidates.")
    print("Review-only candidate created; no template activation or deployment occurred.")

if __name__ == "__main__":
    main()
