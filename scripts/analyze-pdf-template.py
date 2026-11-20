#!/usr/bin/env python3
"""Extract a spatially associated, review-only checklist candidate from a PDF.

Checkpoint IDs are detected only in the serial-number column. Text is associated
by page geometry across PDF text blocks and continues to the next serial row,
while section heading rows are excluded. This is still a candidate: OCR, ambiguous
table layouts, and all flight-safety wording require human review.
"""
import argparse, hashlib, json, re
from pathlib import Path
import fitz

CHECKPOINT = re.compile(r"^\\d+(?:\\.\\d+){1,3}$")
SECTION_NUMBER = re.compile(r"^\\d+\\.$")
SERIAL_X_MAX = 120
CONTENT_X_MAX = 500
ROW_TOLERANCE = 2.2

def _rows(page):
    clusters=[]
    for word in sorted(page.get_text("words", sort=True), key=lambda w: ((w[1]+w[3])/2, w[0])):
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
    pages=[];checkpoints=[];latest_section=None
    for page_index,page in enumerate(document):
        rows=_rows(page)
        serial_rows=[]
        section_rows=set()
        for row_index,row in enumerate(rows):
            words=row["words"]
            for index,word in enumerate(words):
                token=word[4].strip()
                if SECTION_NUMBER.fullmatch(token) and float(word[0])>250:
                    heading=" ".join(w[4] for w in words[index+1:] if w[0]<CONTENT_X_MAX).strip()
                    if heading:
                        latest_section=heading
                        section_rows.add(row_index)
            serial=next((w for w in words if float(w[0])<SERIAL_X_MAX and
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
            item={
                "id":ident,"page":page_index+1,
                "bbox":[round(float(v),2) for v in serial[:4]],
                "descriptionCandidate":text,
                "sectionTitleCandidate":section_title,
                "sourceLines":content_lines,
                "reviewRequired":True
            }
            checkpoints.append(item);page_candidates.append(item)
        text_lines=[]
        for row in rows:
            words=row["words"]
            text_lines.append({"text":" ".join(w[4] for w in words),
                "bbox":[round(min(w[0] for w in words),2),round(min(w[1] for w in words),2),
                        round(max(w[2] for w in words),2),round(max(w[3] for w in words),2)]})
        pages.append({"page":page_index+1,"width":round(page.rect.width,3),
            "height":round(page.rect.height,3),"rotation":page.rotation,
            "text":page.get_text("text",sort=True),"textLines":text_lines,
            "checkpointCandidates":page_candidates,"drawingCount":len(page.get_drawings())})
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
    full_text="\\n".join(page["text"] for page in pages)
    doc_match=re.search(r"Doc(?:ument)?\\s*Number\\s*:\\s*([A-Za-z0-9_-]+)",full_text,re.IGNORECASE)
    document_number=doc_match.group(1) if doc_match else None
    return {"candidateVersion":3,"documentNumber":document_number,"numberingGaps":numbering_gaps,"sourceFile":source.name,"sourceBytes":len(raw),
        "sha256":hashlib.sha256(raw).hexdigest(),"pageCount":len(document),"pages":pages,
        "checkpointCandidates":checkpoints,"duplicateCheckpointIds":duplicates,
        "requiresHumanReview":True,"activationAllowed":False,
        "reviewChecklist":["Compare every extracted ID and description with the rendered source PDF.",
            "Review multi-line and merged-cell text; spatial association is a candidate, not semantic interpretation.",
            "Confirm no checklist row is missing or merged with a neighbouring row.",
            "Review scanned/image-only pages separately; OCR is not silently assumed.",\n            "Investigate numbering gaps without inventing missing checklist items.",
            "Map status, remarks, signature and evidence areas explicitly before approval."]}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("pdf",type=Path)
    parser.add_argument("--output",type=Path,default=Path("template-candidate.json"))
    args=parser.parse_args()
    if not args.pdf.is_file() or args.pdf.suffix.lower()!=".pdf":
        raise SystemExit("Input must be an existing PDF file.")
    try: result=analyse(args.pdf)
    except Exception as error: raise SystemExit(f"PDF analysis failed safely: {error}")
    args.output.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\\n",encoding="utf-8")
    print(f"Analysed {result['pageCount']} pages; found {len(result['checkpointCandidates'])} checkpoint candidates.")
    print("Review-only candidate created; activation remains blocked pending human verification.")

if __name__=="__main__": main()
