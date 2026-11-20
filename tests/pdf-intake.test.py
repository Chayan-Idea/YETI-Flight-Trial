#!/usr/bin/env python3
"""Fast deterministic tests for the PDF intake extractor."""
import importlib.util
import tempfile
from pathlib import Path
import fitz

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("yeti_pdf_intake", ROOT / "scripts/analyze-pdf-template.py")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)

with tempfile.TemporaryDirectory() as directory:
    source = Path(directory) / "sample.pdf"
    document = fitz.open()
    page = document.new_page(width=842, height=595)
    page.insert_text((50, 80), "1. PRE-FLIGHT CHECKS", fontsize=12)
    page.insert_text((60, 110), "1.1 Verify airframe structure", fontsize=10)
    page.insert_text((60, 130), "1.2 Inspect propulsion system", fontsize=10)
    page.insert_text((60, 150), "1.2 Inspect propulsion system duplicate", fontsize=10)
    document.save(source)
    candidate = MODULE.analyse(source)
    assert candidate["pageCount"] == 1
    assert [item["id"] for item in candidate["checkpointCandidates"]] == ["1.1", "1.2", "1.2"]
    assert candidate["duplicateCheckpointIds"] == ["1.2"]
    assert candidate["checkpointCandidates"][0]["descriptionCandidate"] == "Verify airframe structure"
    assert candidate["requiresHumanReview"] is True
    assert candidate["activationAllowed"] is False
    assert len(candidate["sha256"]) == 64

    invalid = Path(directory) / "invalid.pdf"
    invalid.write_bytes(b"not a PDF")
    try:
        MODULE.analyse(invalid)
        raise AssertionError("Invalid PDF should be rejected")
    except ValueError as error:
        assert "valid PDF header" in str(error)


    # A clean single-checkpoint source builds a coordinate-free, review-only package.
    simple = Path(directory) / "simple.pdf"
    simple_doc = fitz.open()
    simple_page = simple_doc.new_page(width=612, height=792)
    simple_page.insert_text((400, 60), "1. DAILY CHECKS", fontsize=12)
    simple_page.insert_text((50, 90), "1.1", fontsize=10)
    simple_page.insert_text((230, 90), "Inspect airframe condition", fontsize=10)
    simple_page.insert_text((230, 100), "and verify all fasteners", fontsize=10)
    simple_page.insert_text((50, 130), "1.2", fontsize=10)
    simple_page.insert_text((230, 130), "Check propulsion system", fontsize=10)
    simple_page.insert_text((400, 145), "2. NEXT SECTION", fontsize=12)
    simple_page.insert_text((50, 165), "2.1", fontsize=10)
    simple_page.insert_text((230, 165), "Confirm safety equipment", fontsize=10)
    simple_doc.save(simple)
    simple_candidate = MODULE.analyse(simple)
    candidate_path = Path(directory) / "simple-candidate.json"
    candidate_path.write_text(__import__("json").dumps(simple_candidate), encoding="utf-8")
    BUILDER_SPEC = importlib.util.spec_from_file_location("yeti_pdf_package_builder", ROOT / "scripts/build-pdf-review-package.py")
    BUILDER = importlib.util.module_from_spec(BUILDER_SPEC)
    BUILDER_SPEC.loader.exec_module(BUILDER)
    package = BUILDER.build(candidate_path, simple, "TEST_TEMPLATE", "1.0.0")
    assert package["activation"]["status"] == "candidate"
    assert package["activation"]["reviewRequired"] is True
    assert package["template"]["signatureMode"] == "append-signature-page"
    assert package["template"]["rows"] == {}
    assert package["sections"][0]["title"] == "DAILY CHECKS"
    assert package["sections"][0]["items"][0]["id"] == "1.1"
    assert package["sections"][0]["items"][0]["title"] == "Inspect airframe condition and verify all fasteners"
    assert package["sections"][0]["items"][1]["title"] == "Check propulsion system"
    assert package["sections"][1]["title"] == "NEXT SECTION"
    assert package["sections"][1]["items"][0]["id"] == "2.1"
    try:
        BUILDER.build(candidate_path, Path(directory) / "missing.pdf", "TEST_TEMPLATE", "1.0.0")
        raise AssertionError("Missing PDF source should be rejected")
    except ValueError:
        pass

# Regression against the repository's approved two-page YETI TD0 master PDF.
master_pdf = ROOT / "assets/templates/YETI TD0 Trial DAC Format.pdf"
master_candidate = MODULE.analyse(master_pdf)
expected_ids = [
    "1.1","1.2","2.1","2.2","3.1","3.2","3.3","3.4",
    "4.1.1","4.1.2","4.1.3","4.1.4","4.2.1","4.2.2","4.2.3","4.2.4",
    "4.3.1","4.3.2","4.3.3","4.3.4","4.3.5","4.3.6","4.3.7",
    "4.4.1","4.4.2","4.4.3","4.4.4","4.4.6",
    "4.5.1","4.5.2","4.5.3","4.5.4",
    "4.6.1","4.6.2","4.6.3","4.6.4","4.6.5",
    "4.7.1","4.7.2","4.7.3","4.7.4","4.7.5","4.8.1","4.8.2",
    "4.9.1","4.9.2","4.9.3","4.9.4","5.1","5.2",
    "6.1","6.2","6.3","6.4","7.1","7.2","7.3","7.4","8.1","8.2","8.3","9.0"
]
assert [item["id"] for item in master_candidate["checkpointCandidates"]] == expected_ids
assert master_candidate["duplicateCheckpointIds"] == []
assert len({item["sectionTitleCandidate"] for item in master_candidate["checkpointCandidates"]}) == 9
assert master_candidate["sha256"] == "03fe8f45e83b081669c4386585004a351ddcb2d8a14923854bafc36436d79560"
master_candidate_path = ROOT / "template-candidates" / "master-regression-candidate.json"
master_candidate_path.parent.mkdir(exist_ok=True)
master_candidate_path.write_text(__import__("json").dumps(master_candidate), encoding="utf-8")
master_package = BUILDER.build(master_candidate_path, master_pdf, "IF_YETI_TD0_FTR_CKT_005", "1.0.0")
assert len(master_package["sections"]) == 9
assert sum(len(section["items"]) for section in master_package["sections"]) == 62
assert master_package["activation"]["status"] == "candidate"
master_candidate_path.unlink()
master_candidate_path.parent.rmdir()

print("PDF intake extraction tests passed: numbered IDs, descriptions, duplicates, SHA-256 and fail-closed review, section inference and coordinate-free package generation.")
