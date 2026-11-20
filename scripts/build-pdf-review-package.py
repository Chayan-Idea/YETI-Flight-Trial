#!/usr/bin/env python3
"""Build a review-only, coordinate-free checklist package from an extracted PDF candidate.

The generated package preserves the original PDF and uses a separate signature page
when no reviewed signature cell mapping exists. It never approves or activates itself.
"""
import argparse, json, re
from pathlib import Path

def build(candidate_path: Path, pdf_path: Path, template_id: str, version: str):
    candidate=json.loads(candidate_path.read_text(encoding="utf-8"))
    if not candidate.get("requiresHumanReview") or candidate.get("activationAllowed") is not False:
        raise ValueError("Input must be an unapproved review-only extraction candidate.")
    if candidate.get("sha256") is None or not candidate.get("pages"):
        raise ValueError("Candidate is missing source checksum or page geometry.")
    if not pdf_path.is_file() or pdf_path.suffix.lower() != ".pdf":
        raise ValueError("Source PDF path must point to an existing PDF.")
    import hashlib
    digest=hashlib.sha256(pdf_path.read_bytes()).hexdigest()
    if digest != candidate["sha256"]:
        raise ValueError("Source PDF checksum differs from the extracted candidate.")
    first=candidate["pages"][0]
    sections=[]; by_title={}
    seen=set()
    for point in candidate.get("checkpointCandidates",[]):
        ident=str(point.get("id","")).strip()
        if not re.fullmatch(r"\d+(?:\.\d+){1,3}",ident):
            continue
        if ident in seen:
            raise ValueError("Duplicate checkpoint ID prevents package generation: "+ident)
        seen.add(ident)
        title=(point.get("descriptionCandidate") or point.get("lineText") or ident).strip()
        section_title=(point.get("sectionTitleCandidate") or "Extracted Checklist").strip()
        if section_title not in by_title:
            by_title[section_title]={"title":section_title,"items":[]}
            sections.append(by_title[section_title])
        by_title[section_title]["items"].append({
            "id":ident,"title":title,"criteria":[],
            "sourcePage":point.get("page"),"sourceText":point.get("lineText","")
        })
    if not seen:
        raise ValueError("No numbered checklist checkpoints were found; scanned/image PDFs need manual/OCR review.")
    return {
      "packageVersion":1,
      "activation":{"status":"candidate","reviewRequired":True,"approvedBy":"","approvalReference":""},
      "document":{"templateId":template_id,"version":version,"pageCount":candidate["pageCount"],
        "pageWidth":first["width"],"pageHeight":first["height"],
        "orientation":"landscape" if first["width"]>=first["height"] else "portrait"},
      "sourcePdf":{"path":str(pdf_path).replace("\\","/"),"sha256":digest},
      "template":{"page":{"width":first["width"],"height":first["height"],"unit":"pt"},
        "rows":{},"columns":{},"signatureMode":"append-signature-page"},
      "sections":sections,
      "extractionReview":{"sourceCandidate":candidate_path.name,"checkpointCount":len(seen),
        "duplicateIds":candidate.get("duplicateCheckpointIds",[]),
        "numberingGaps":candidate.get("numberingGaps",[]),
        "requiresHumanReview":True,"activationAllowed":False,
        "warnings":["Verify every extracted checkpoint and exact wording against the source PDF.",
          "Investigate numbering gaps; missing IDs are never auto-created.",
          "Review section grouping and multi-line descriptions.",
          "Signature is placed on a separate appended page until a source signature cell is explicitly mapped.",
          "Photo evidence is appended on separate pages; original PDF pages remain untouched."]}
    }

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("candidate",type=Path);parser.add_argument("pdf",type=Path)
    parser.add_argument("--template-id",required=True);parser.add_argument("--version",default="1.0.0")
    parser.add_argument("--output",type=Path,default=Path("template-package.candidate.json"))
    args=parser.parse_args()
    package=build(args.candidate,args.pdf,args.template_id,args.version)
    args.output.write_text(json.dumps(package,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print(f"Review-only package generated: {len(package['sections'])} sections, {package['extractionReview']['checkpointCount']} checkpoints.")
    print("Activation remains blocked until wording, section grouping and output layout are reviewed.")

if __name__=="__main__": main()
