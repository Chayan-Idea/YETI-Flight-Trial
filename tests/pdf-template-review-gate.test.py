#!/usr/bin/env python3
"""Unit tests for the human-review and exact-cell release gate."""
import importlib.util, json, tempfile
from pathlib import Path
import fitz
ROOT=Path(__file__).resolve().parents[1]
def load(name,path):
    spec=importlib.util.spec_from_file_location(name,ROOT/path)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
analyzer=load("analyzer","scripts/analyze-pdf-template.py")
builder=load("builder","scripts/build-pdf-review-package.py")
publisher=load("publisher","scripts/publish-approved-pdf.py")
with tempfile.TemporaryDirectory() as tmp:
    root=Path(tmp);pdf=root/"source.pdf"
    doc=fitz.open();page=doc.new_page(width=612,height=792)
    page.insert_text((400,60),"1. DAILY CHECKS",fontsize=12)
    page.insert_text((50,90),"1.1",fontsize=10);page.insert_text((230,90),"Inspect airframe condition",fontsize=10)
    page.insert_text((50,130),"1.2",fontsize=10);page.insert_text((230,130),"Check propulsion system",fontsize=10)
    doc.save(pdf)
    candidate=analyzer.analyse(pdf)
    cp=root/"candidate.json";cp.write_text(json.dumps(candidate),encoding="utf-8")
    package=builder.build(cp,pdf,"TEST_TEMPLATE","candidate")
    package["template"]["rows"]={"1.1":[1,90],"1.2":[1,130]}
    package["template"]["columns"]={"passCenterX":400,"failCenterX":430,"notAvailableCenterX":460,"remarksLeft":480,"remarksRight":600}
    review=package["extractionReview"]
    review.update({"reviewStatus":"reviewed","reviewedBy":"QA Reviewer","approvalReference":"QA-REVIEW-001",
        "sourceSha256":candidate["sha256"],"reviewedAllPages":True,"reviewedWording":True,
        "reviewedGrouping":True,"reviewedCoordinates":True,"reviewedCheckpointIds":["1.1","1.2"],"idCorrections":{},"manuallyAddedCheckpointIds":[],
        "acknowledgedNumberingGaps":[]})
    assert publisher.validate_reviewed_package(package,candidate["sha256"],candidate,root/"review.json")==["1.1","1.2"]
    invalid=json.loads(json.dumps(package));invalid["template"]["rows"].pop("1.2")
    try:
        publisher.validate_reviewed_package(invalid,candidate["sha256"],candidate,root/"review.json")
        raise AssertionError("Missing cell mapping must block release")
    except ValueError as error: assert "1.2" in str(error)
    invalid=json.loads(json.dumps(package));invalid["extractionReview"]["reviewedWording"]=False
    try:
        publisher.validate_reviewed_package(invalid,candidate["sha256"],candidate,root/"review.json")
        raise AssertionError("Unreviewed wording must block release")
    except ValueError as error: assert "attest" in str(error)
    invalid=json.loads(json.dumps(package));invalid["sourcePdf"]["sha256"]="0"*64
    try:
        publisher.validate_reviewed_package(invalid,candidate["sha256"],candidate,root/"review.json")
        raise AssertionError("Mismatched PDF checksum must block release")
    except ValueError as error: assert "checksum" in str(error)

    corrected=json.loads(json.dumps(package))
    corrected["sections"][0]["items"][0]["id"]="1.1.1"
    corrected["extractionReview"]["idCorrections"]={"1.1":"1.1.1"}
    corrected["extractionReview"]["reviewedCheckpointIds"]=["1.1.1","1.2"]
    assert publisher.validate_reviewed_package(corrected,candidate["sha256"],candidate,root/"review.json")==["1.1.1","1.2"]
    expanded=json.loads(json.dumps(package))
    expanded["sections"][0]["items"].insert(1,{"id":"1.1.1","title":"Manually verified missing sub-check","criteria":[]})
    expanded["template"]["rows"]["1.1.1"]=[1,110]
    expanded["extractionReview"]["manuallyAddedCheckpointIds"]=["1.1.1"]
    expanded["extractionReview"]["reviewedCheckpointIds"]=["1.1","1.1.1","1.2"]
    assert publisher.validate_reviewed_package(expanded,candidate["sha256"],candidate,root/"review.json")==["1.1","1.1.1","1.2"]

print("PDF release-gate tests passed: human review attestations, exact ID order, cell mappings and source checksum.")
