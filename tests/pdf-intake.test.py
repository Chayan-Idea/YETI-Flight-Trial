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

print("PDF intake extraction tests passed: numbered IDs, descriptions, duplicates, SHA-256 and fail-closed review.")
