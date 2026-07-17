import os
import json
from reportlab.pdfgen import canvas
from fastapi.testclient import TestClient
from app.main import app

def create_pdf(filename, num_pages, text):
    c = canvas.Canvas(filename)
    long_text = text + " " + "This is extra text to ensure the chunk length is greater than fifty characters so that it gets processed properly by the document indexer."
    for _ in range(num_pages):
        c.drawString(100, 750, long_text)
        c.showPage()
    c.save()

client = TestClient(app)

def test_pdf(filename, num_pages, label):
    print(f"\n--- Testing {label} PDF ---")
    create_pdf(filename, num_pages, f"This is a test document for {label} PDF.")
    
    # Upload
    with open(filename, "rb") as f:
        resp = client.post("/api/v1/document/upload", files={"file": (filename, f, "application/pdf")})
    assert resp.status_code == 200, f"Upload failed: {resp.text}"
    doc_id = resp.json()["document_id"]
    print(f"Uploaded {label} PDF. Doc ID: {doc_id}")
    
    # Analyze (required to generate outline/chunks)
    print("Analyzing...")
    resp = client.post(f"/api/v1/document/{doc_id}/analyze", json={"document_id": doc_id})
    assert resp.status_code == 200, f"Analyze failed: {resp.text}"
    print("Analysis complete.")
    
    # Summary
    print("Generating summary...")
    resp = client.post(f"/api/v1/document/{doc_id}/summary", json={"chapter_id": None})
    if resp.status_code != 200:
        print(f"Summary failed (status={resp.status_code}): {resp.json()}")
    else:
        print(f"Summary success: {resp.json().get('result', '')[:100]}...")

if __name__ == "__main__":
    try:
        test_pdf("small.pdf", 1, "Small")
        test_pdf("medium.pdf", 5, "Medium")
        test_pdf("large.pdf", 20, "Large")
    finally:
        for f in ["small.pdf", "medium.pdf", "large.pdf"]:
            if os.path.exists(f):
                os.remove(f)
