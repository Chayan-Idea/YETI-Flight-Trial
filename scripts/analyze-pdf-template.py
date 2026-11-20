#!/usr/bin/env python3
"""Extract a structured, review-only candidate from a PDF in template-inbox/.

The output is designed for ChatGPT-assisted checklist/package preparation.
It deliberately does not guess status columns, signature anchors, or activate a
template: those coordinates must be reviewed against the rendered source PDF.
"""
import argparse, hashlib, json, re
from pathlib import Path
import fitz

CHECKPOINT = re.compile(r"^\d+(?:\.\d+){1,3}$")
SECTION_NUMBER = re.compile(r"^\d+\.$")

def analyse(source: Path):
    raw = source.read_bytes()
    if not raw.startswith(b"%PDF-"):
        raise ValueError("Input does not have a valid PDF header.")
    document = fitz.open(stream=raw, filetype="pdf")
    if document.is_encrypted and not document.authenticate(""):
        raise ValueError("Encrypted PDFs are not supported for automatic extraction.")
    pages, checkpoints = [], []
    latest_section_by_page = {}
    for page_index, page in enumerate(document):
        words = page.get_text("words", sort=True)
        blocks = page.get_text("dict")["blocks"]
        lines = {}
        for word in words:
            key = (word[5], word[6])
            lines.setdefault(key, []).append(word)
        text_lines = []
        for key, line_words in lines.items():
            text_lines.append({
                "block": key[0], "line": key[1],
                "text": " ".join(w[4] for w in line_words),
                "bbox": [round(float(v), 2) for v in (
                    min(w[0] for w in line_words), min(w[1] for w in line_words),
                    max(w[2] for w in line_words), max(w[3] for w in line_words))]
            })
        page_checkpoints = []
        for key, line_words in lines.items():
            for index, word in enumerate(line_words):
                token = word[4].strip()
                line_text = " ".join(w[4] for w in line_words).strip()
                if SECTION_NUMBER.fullmatch(token):
                    heading = " ".join(w[4] for w in line_words[index + 1:]).strip()
                    if heading:
                        latest_section_by_page[page_index + 1] = heading
                    continue
                # Checkpoint IDs live in the left serial-number column. Numeric
                # thresholds embedded in descriptions (e.g. 13.9 V or 3.3 V)
                # must never be misclassified as checklist IDs.
                if not CHECKPOINT.fullmatch(token) or float(word[0]) > 120:
                    continue
                description = " ".join(w[4] for w in line_words[index + 1:]).strip()
                item = {
                    "id": token, "page": page_index + 1,
                    "bbox": [round(float(value), 2) for value in word[:4]],
                    "lineText": " ".join(w[4] for w in line_words),
                    "descriptionCandidate": description,
                    "sectionTitleCandidate": latest_section_by_page.get(page_index + 1, f"Page {page_index + 1}"),
                    "block": key[0], "line": key[1]
                }
                checkpoints.append(item)
                page_checkpoints.append(item)
        pages.append({
            "page": page_index + 1,
            "width": round(page.rect.width, 3),
            "height": round(page.rect.height, 3),
            "rotation": page.rotation,
            "text": page.get_text("text", sort=True),
            "textLines": text_lines,
            "checkpointCandidates": page_checkpoints,
            "drawingCount": len(page.get_drawings())
        })
    return {
        "candidateVersion": 2,
        "sourceFile": source.name,
        "sourceBytes": len(raw),
        "sha256": hashlib.sha256(raw).hexdigest(),
        "pageCount": len(document),
        "pages": pages,
        "checkpointCandidates": checkpoints,
        "duplicateCheckpointIds": sorted({
            item["id"] for item in checkpoints
            if sum(x["id"] == item["id"] for x in checkpoints) > 1
        }),
        "requiresHumanReview": True,
        "reviewChecklist": [
            "Confirm every extracted checkpoint and its exact wording.",
            "Review page screenshots for multi-line descriptions and table grouping.",
            "Map status, remarks, signature, and photo evidence areas explicitly.",
            "Verify every coordinate against the original PDF before approval."
        ],
        "activationAllowed": False
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--output", type=Path, default=Path("template-candidate.json"))
    args = parser.parse_args()
    if not args.pdf.is_file() or args.pdf.suffix.lower() != ".pdf":
        raise SystemExit("Input must be an existing PDF file.")
    try:
        result = analyse(args.pdf)
    except Exception as error:
        raise SystemExit(f"PDF analysis failed safely: {error}")
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Analysed {result['pageCount']} pages; found {len(result['checkpointCandidates'])} checkpoint candidates.")
    print("Structured review candidate created; activation and deployment remain blocked pending visual review.")

if __name__ == "__main__":
    main()
