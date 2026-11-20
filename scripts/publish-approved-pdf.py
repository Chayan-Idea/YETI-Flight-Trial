#!/usr/bin/env python3
"""Publish only a separately reviewed, source-bound PDF checklist package."""
import argparse, hashlib, json, re, shutil, subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
def run(*args): subprocess.run([str(a) for a in args],cwd=ROOT,check=True)
def safe(value):
    value=re.sub(r"[^A-Za-z0-9._-]+","_",str(value)).strip("._-")
    if not value: raise ValueError("Could not derive a safe template identifier.")
    return value[:80]
def inside_inbox(value):
    path=(ROOT/value).resolve()
    inbox=(ROOT/"template-inbox").resolve()
    if not str(value).startswith("template-inbox/") or not path.is_relative_to(inbox) or not path.is_file():
        raise ValueError("Input must be an existing file inside template-inbox/; traversal and external symlinks are rejected.")
    return path
def validate_reviewed_package(package,pdf_digest,candidate,review_path):
    if not isinstance(package,dict) or package.get("packageVersion")!=1:
        raise ValueError("Reviewed package must use packageVersion 1.")
    if package.get("activation",{}).get("status")!="candidate":
        raise ValueError("Review package must remain a candidate until this controlled approval step.")
    review=package.get("extractionReview",{})
    required_flags=("reviewedAllPages","reviewedWording","reviewedGrouping","reviewedCoordinates")
    if review.get("reviewStatus")!="reviewed" or any(review.get(flag) is not True for flag in required_flags):
        raise ValueError("Review package must explicitly attest that all pages, wording, grouping and coordinates were reviewed.")
    if not str(review.get("reviewedBy","")).strip() or not str(review.get("approvalReference","")).strip():
        raise ValueError("Reviewed package must identify its reviewer and review record.")
    if review.get("sourceSha256")!=pdf_digest or package.get("sourcePdf",{}).get("sha256")!=pdf_digest:
        raise ValueError("Reviewed package checksum does not match the supplied PDF.")
    expected=[str(p.get("id","")).strip() for p in candidate.get("checkpointCandidates",[])]
    actual=[str(item.get("id","")).strip() for section in package.get("sections",[]) for item in section.get("items",[])]
    if not expected or actual!=expected:
        raise ValueError("Reviewed checkpoint IDs/order must exactly match the source-bound extraction. Correct the review package before release.")
    if any(not str(item.get("title","")).strip() for section in package.get("sections",[]) for item in section.get("items",[])):
        raise ValueError("Every checkpoint needs a reviewed non-empty description.")
    if review.get("reviewedCheckpointIds")!=expected:
        raise ValueError("Reviewed checkpoint ID attestation is missing or differs from the extracted PDF.")
    if review.get("acknowledgedNumberingGaps")!=candidate.get("numberingGaps",[]):
        raise ValueError("Every detected numbering gap must be explicitly acknowledged in the reviewed package.")
    document=package.get("document",{})
    template=package.get("template",{})
    page=template.get("page",{})
    if document.get("pageCount")!=candidate.get("pageCount") or page.get("width")!=document.get("pageWidth") or page.get("height")!=document.get("pageHeight"):
        raise ValueError("Reviewed package page count or geometry differs from the source PDF.")
    if not isinstance(template.get("rows"),dict):
        raise ValueError("A row-coordinate map is mandatory.")
    for ident in expected:
        if ident=="9.0": continue
        row=template["rows"].get(ident)
        if not isinstance(row,list) or len(row)!=2 or not isinstance(row[0],int) or not 1<=row[0]<=document["pageCount"] or not isinstance(row[1],(int,float)) or not 0<=row[1]<=document["pageHeight"]:
            raise ValueError("Checkpoint "+ident+" has no valid mapped source-PDF row.")
    columns=template.get("columns",{})
    required=("passCenterX","failCenterX","notAvailableCenterX","remarksLeft","remarksRight")
    if any(not isinstance(columns.get(key),(int,float)) for key in required):
        raise ValueError("PASS, FAIL, N/A and Remarks cell coordinates must all be mapped.")
    if not (0<=columns["passCenterX"]<columns["failCenterX"]<columns["notAvailableCenterX"]<columns["remarksLeft"]<columns["remarksRight"]<=document["pageWidth"]):
        raise ValueError("Status and Remarks column geometry is invalid or outside the PDF.")
    mode=template.get("signatureMode")
    if mode=="mapped-source-cell":
        box=template.get("specialFields",{}).get("checkerReviewer")
        if not isinstance(box,dict) or not isinstance(box.get("page"),int) or not 1<=box["page"]<=document["pageCount"]:
            raise ValueError("Mapped signature mode requires a reviewed Checker/Reviewer source-cell box.")
    elif mode!="append-signature-page":
        raise ValueError("Choose a reviewed source-cell signature map or explicit append-signature-page mode.")
    return expected

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--pdf",required=True)
    parser.add_argument("--review-package",required=True,help="Human-reviewed candidate package JSON committed inside template-inbox/")
    parser.add_argument("--approved-by",required=True)
    parser.add_argument("--approval-reference",required=True)
    args=parser.parse_args()
    pdf=inside_inbox(args.pdf)
    review_path=inside_inbox(args.review_package)
    if not args.approved_by.strip() or not args.approval_reference.strip():
        raise ValueError("Named release approver and approval reference are mandatory.")
    raw=pdf.read_bytes()
    if not raw.startswith(b"%PDF-") or len(raw)<100: raise ValueError("Source file is not a valid PDF.")
    digest=hashlib.sha256(raw).hexdigest()
    work=ROOT/".yeti-pdf-publish";work.mkdir(exist_ok=True)
    candidate_path=work/"candidate.json"
    run("python","scripts/analyze-pdf-template.py",pdf,"--output",candidate_path)
    candidate=json.loads(candidate_path.read_text(encoding="utf-8"))
    if not candidate.get("checkpointCandidates"): raise ValueError("No checkpoints extracted. OCR or manual review is required.")
    if candidate.get("duplicateCheckpointIds"): raise ValueError("Duplicate checkpoint IDs detected; release blocked.")
    package=json.loads(review_path.read_text(encoding="utf-8"))
    ids=validate_reviewed_package(package,digest,candidate,review_path)
    template_id=safe(package["document"]["templateId"])
    version="v-"+digest[:12]
    package["document"]["version"]=version
    package["sourcePdf"]["path"]=f"assets/templates/{template_id}/{version}/{safe(pdf.stem)}.pdf"
    package["activation"]={"status":"approved","reviewRequired":False,
        "approvedBy":args.approved_by.strip(),"approvalReference":args.approval_reference.strip(),
        "approvedAt":datetime.now(timezone.utc).isoformat(),"sourceSha256":digest,
        "reviewedBy":package["extractionReview"]["reviewedBy"]}
    package["extractionReview"]["reviewStatus"]="approved"
    package["extractionReview"]["activationAllowed"]=True
    package["extractionReview"]["requiresHumanReview"]=False
    version_dir=ROOT/"assets"/"templates"/template_id/version
    if version_dir.exists(): raise ValueError("This PDF version already exists; immutable versions cannot be overwritten.")
    version_dir.mkdir(parents=True,exist_ok=False)
    shutil.copy2(pdf,version_dir/(safe(pdf.stem)+".pdf"))
    (version_dir/"template-package.json").write_text(json.dumps(package,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    manifest_path=ROOT/"js"/"daily-airworthiness-pdf-manifest.js"
    manifest=manifest_path.read_text(encoding="utf-8")
    url=f"./assets/templates/{template_id}/{version}/template-package.json"
    manifest,count=re.subn(r'window\.YETI_DAILY_AIRWORTHINESS_PDF_PACKAGE_URL="[^"]+";',
        f'window.YETI_DAILY_AIRWORTHINESS_PDF_PACKAGE_URL="{url}";',manifest,count=1)
    if count!=1: raise ValueError("Could not safely update the active PDF package pointer.")
    manifest_path.write_text(manifest,encoding="utf-8")
    sw_path=ROOT/"service-worker.js";sw=sw_path.read_text(encoding="utf-8")
    match=re.search(r"const CACHE='yeti-flight-trial-shell-v(\\d+)';",sw)
    if not match: raise ValueError("Could not locate service-worker cache version.")
    sw_path.write_text(sw[:match.start()]+f"const CACHE='yeti-flight-trial-shell-v{int(match.group(1))+1}';"+sw[match.end():],encoding="utf-8")
    print("APPROVED PDF TEMPLATE PUBLISHED")
    print("Template:",template_id,"Version:",version,"Sections:",len(package["sections"]),"Checkpoints:",len(ids))
    print("SHA-256:",digest,"Active package:",url)
    print("Source pages preserved; signature:",package["template"]["signatureMode"],"; photos appended as evidence pages.")

if __name__=="__main__": main()
