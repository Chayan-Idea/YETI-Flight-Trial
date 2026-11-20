#!/usr/bin/env python3
"""Extract spatially associated checklist candidates from searchable or scanned PDFs.

OCR is a fallback, never an approval signal. Every candidate remains review-only.
"""
import argparse, hashlib, json, re
from pathlib import Path
import fitz

CHECKPOINT = re.compile(r"^\d+(?:\.\d+){1,3}$")
SECTION_NUMBER = re.compile(r"^\d+\.$")
SERIAL_X_MAX = 120
CONTENT_X_MAX = 500
ROW_TOLERANCE = 2.2

def _ocr_words(page):
    """Return PyMuPDF-compatible word tuples and confidence values for image-only pages."""
    try:
        import io
        import pytesseract
        from PIL import Image
    except ImportError as error:
        raise RuntimeError("This PDF contains scanned pages. Install pytesseract and Pillow and ensure the Tesseract OCR binary is available.") from error
    scale = 2.5
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
    image = Image.open(io.BytesIO(pix.tobytes("png")))
    data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT, config="--psm 6")
    words, confidences = [], []
    for index, raw in enumerate(data["text"]):
        token = str(raw).strip()
        try:
            confidence = float(data["conf"][index])
        except (TypeError, ValueError):
            confidence = -1
        if not token or confidence < 0:
            continue
        x0 = float(data["left"][index]) / scale
        y0 = float(data["top"][index]) / scale
        x1 = x0 + float(data["width"][index]) / scale
        y1 = y0 + float(data["height"][index]) / scale
        words.append((x0, y0, x1, y1, token, data["block_num"][index],
                      data["line_num"][index], index))
        confidences.append(confidence)
    return words, (round(sum(confidences) / len(confidences), 1) if confidences else 0)

def _rows(page, words=None):
    words = page.get_text("words", sort=True) if words is None else words
    clusters=[]
    for word in sorted(words, key=lambda w: ((w[1]+w[3])/2, w[0])):
        cy=(word[1]+word[3])/2
        match=next((row for row in clusters if abs(row["cy"]-cy)<=ROW_TOLERANCE),None)
        if match is None:
            match={"cy":cy,"words":[]};clusters.append(match)
        match["words"].append(word)
    for row in clusters:
        row["words"].sort(key=lambda w:w[0])
    return sorted(clusters,key=lambda row:row["cy"])

def analyse(source: Path):
    raw=source.read_bytes()
    if not raw.startswith(b"%PDF-"):
        raise ValueError("Input does not have a valid PDF header.")
    document=fitz.open(stream=raw,filetype="pdf")
    if document.is_encrypted and not document.authenticate(""):
        raise ValueError("Encrypted PDFs are not supported for automatic extraction.")
    if len(document) < 1:
        raise ValueError("PDF contains no pages.")
    pages=[];checkpoints=[];latest_section=None
    for page_index,page in enumerate(document):
        words=page.get_text("words",sort=True)
        extraction_method="text"
        ocr_confidence=None
        if len(words) < 4 or (len(words) < 12 and bool(page.get_images(full=True))):
            words,ocr_confidence=_ocr_words(page)
            extraction_method="ocr"
        rows=_rows(page,words)
        serial_rows=[]
        section_rows=set()
        for row_index,row in enumerate(rows):
            row_words=row["words"]
            for index,word in enumerate(row_words):
                token=word[4].strip()
                if SECTION_NUMBER.fullmatch(token) and float(word[0])>250:
                    heading=" ".join(w[4] for w in row_words[index+1:] if w[0]<CONTENT_X_MAX).strip()
                    if heading:
                        latest_section=heading
                        section_rows.add(row_index)
            serial=next((w for w in row_words if float(w[0])<SERIAL_X_MAX and
                         (w[4].strip()=="9" or CHECKPOINT.fullmatch(w[4].strip()))),None)
            if serial:
                ident="9.0" if serial[4].strip()=="9" else serial[4].strip()
                serial_rows.append((row_index,ident,serial,latest_section or f"Page {page_index+1}"))
        page_candidates=[]
        for position,(row_index,ident,serial,section_title) in enumerate(serial_rows):
            next_row=serial_rows[position+1][0] if position+1<len(serial_rows) else len(rows)
            content_lines=[]
            for content_row_index in range(row_index,next_row):
                if content_row_index in section_rows:
                    continue
                content_words=[w for w in rows[content_row_index]["words"]
                               if float(w[0])>=SERIAL_X_MAX and float(w[0])<CONTENT_X_MAX]
                if content_words:
                    content_lines.append(" ".join(w[4] for w in content_words).strip())
            text=" ".join(line for line in content_lines if line).strip()
            if ident=="9.0":
                text=text or "Other details"
            item={"id":ident,"page":page_index+1,
                "bbox":[round(float(v),2) for v in serial[:4]],
                "descriptionCandidate":text,"sectionTitleCandidate":section_title,
                "sourceLines":content_lines,"extractionMethod":extraction_method,
                "ocrMeanConfidence":ocr_confidence,"reviewRequired":True}
            checkpoints.append(item);page_candidates.append(item)
        text_lines=[]
        for row in rows:
            row_words=row["words"]
            if row_words:
                text_lines.append({"text":" ".join(w[4] for w in row_words),
                    "bbox":[round(min(w[0] for w in row_words),2),round(min(w[1] for w in row_words),2),
                            round(max(w[2] for w in row_words),2),round(max(w[3] for w in row_words),2)]})
        page_text="\n".join(item["text"] for item in text_lines)
        pages.append({"page":page_index+1,"width":round(page.rect.width,3),
            "height":round(page.rect.height,3),"rotation":page.rotation,
            "text":page_text,"textLines":text_lines,"extractionMethod":extraction_method,
            "ocrMeanConfidence":ocr_confidence,"checkpointCandidates":page_candidates,
            "drawingCount":len(page.get_drawings())})
    ids=[item["id"] for item in checkpoints]
    duplicates=sorted({ident for ident in ids if ids.count(ident)>1})
    child_numbers={}
    for ident in ids:
        parts=ident.split(".")
        if len(parts)>1 and parts[-1].isdigit():
            child_numbers.setdefault(".".join(parts[:-1]),set()).add(int(parts[-1]))
    numbering_gaps=[]
    for parent,numbers in child_numbers.items():
        if numbers:
            numbering_gaps.extend(parent+"."+str(number) for number in range(1,max(numbers)+1) if number not in numbers)
    full_text="\n".join(page["text"] for page in pages)
    doc_match=re.search(r"Doc(?:ument)?\s*Number\s*:\s*([A-Za-z0-9_-]+)",full_text,re.IGNORECASE)
    return {"candidateVersion":4,"documentNumber":doc_match.group(1) if doc_match else None,
        "numberingGaps":numbering_gaps,"sourceFile":source.name,"sourceBytes":len(raw),
        "sha256":hashlib.sha256(raw).hexdigest(),"pageCount":len(document),"pages":pages,
        "checkpointCandidates":checkpoints,"duplicateCheckpointIds":duplicates,
        "ocrPages":[p["page"] for p in pages if p["extractionMethod"]=="ocr"],
        "requiresHumanReview":True,"activationAllowed":False,
        "reviewChecklist":["Compare every extracted ID and description with every rendered source page.",
            "Review OCR confidence and manually correct uncertain characters, serial IDs and wording.",
            "Review multi-line and merged-cell text; spatial association is a candidate, not semantic interpretation.",
            "Confirm no checklist row is missing, duplicated or merged with a neighbouring row.",
            "Investigate numbering gaps without inventing missing checklist items.",
            "Map status, remarks, metadata, signature and evidence areas explicitly before approval."]}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("pdf",type=Path)
    parser.add_argument("--output",type=Path,default=Path("template-candidate.json"))
    args=parser.parse_args()
    if not args.pdf.is_file() or args.pdf.suffix.lower()!=".pdf":
        raise SystemExit("Input must be an existing PDF file.")
    try: result=analyse(args.pdf)
    except Exception as error: raise SystemExit(f"PDF analysis failed safely: {error}")
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print(f"Analysed {result['pageCount']} pages; found {len(result['checkpointCandidates'])} checkpoint candidates; OCR pages: {result['ocrPages']}.")
    print("Review-only candidate created; activation remains blocked pending human verification.")

if __name__=="__main__": main()
