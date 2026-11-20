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
    simple_page.insert_text((40, 60), "1. DAILY CHECKS", fontsize=12)
    simple_page.insert_text((50, 90), "1.1 Inspect airframe condition", fontsize=10)
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
    assert package["sections"][0]["items"][0]["title"] == "Inspect airframe condition"
    try:
        BUILDER.build(candidate_path, Path(directory) / "missing.pdf", "TEST_TEMPLATE", "1.0.0")
        raise AssertionError("Missing PDF source should be rejected")
    except ValueError:
        pass

print("PDF intake extraction tests passed: numbered IDs, descriptions, duplicates, SHA-256 and fail-closed review, section inference and coordinate-free package generation.")
