import asyncio
import time
import re
from typing import Set, Tuple, List, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import numpy as np

# Import the new AI model
from vision_model import predict

app = FastAPI(title="MedEcho-Verify API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Keyword Extraction from Transcript ----------
def extract_text_keywords(transcript: str) -> Tuple[Set[str], Set[str], Set[str]]:
    text_lower = transcript.lower()
    laterality_set = set()
    pathology_set = set()
    all_keywords = set()

    if re.search(r'\bleft\b', text_lower):
        laterality_set.add("left")
        all_keywords.add("left")
    if re.search(r'\bright\b', text_lower):
        laterality_set.add("right")
        all_keywords.add("right")
    if re.search(r'\bbilateral\b', text_lower):
        laterality_set.add("bilateral")
        all_keywords.add("bilateral")

    if re.search(r'\bpneumonia\b', text_lower):
        pathology_set.add("pneumonia")
        all_keywords.add("pneumonia")
    if re.search(r'\bcardiomegaly\b', text_lower):
        pathology_set.add("cardiomegaly")
        all_keywords.add("cardiomegaly")
    if re.search(r'\bnormal\b', text_lower):
        pathology_set.add("normal")
        all_keywords.add("normal")

    return laterality_set, pathology_set, all_keywords

# ---------- CMCI Calculation with Laterality Rule ----------
def calculate_cmci(text_keywords: Set[str], vision_keywords: Set[str],
                   text_laterality: Set[str], vision_laterality: Set[str]) -> Tuple[float, bool, str]:
    # Critical rule: left/right mismatch
    if (("left" in text_laterality and "right" in vision_laterality) or
        ("right" in text_laterality and "left" in vision_laterality)):
        return 0.0, True, "⚠️ LATERALITY MISMATCH ALERT: Text and image indicate opposite sides. Patient safety risk!"

    intersection = len(text_keywords.intersection(vision_keywords))
    union = len(text_keywords.union(vision_keywords))
    cmci = (intersection / union) * 100 if union > 0 else 0.0

    conflict_detected = False
    if cmci < 50:
        alert = "⚠️ Low consistency between clinical notes and imaging findings. Please review."
    elif cmci < 85:
        alert = "ℹ️ Moderate consistency detected. Minor discrepancies exist."
    else:
        alert = "✅ High consistency verified. No critical discrepancies."

    return cmci, conflict_detected, alert

# ---------- API Endpoint ----------
@app.post("/api/verify")
async def verify_audit(
    file: UploadFile = File(...),
    transcript: str = Form(...)
):
    start_time = time.time()

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        if image.mode != "RGB":
            image = image.convert("RGB")

        # ---------- AI Vision Inference (REAL) ----------
        vision_lat, vision_path, vision_keywords, bbox = predict(image)

        # ---------- Text Analysis ----------
        text_lat, text_path, text_keywords = extract_text_keywords(transcript)

        # ---------- CMCI Calculation ----------
        cmci_score, conflict_detected, alert_message = calculate_cmci(
            text_keywords, vision_keywords, text_lat, vision_lat
        )

        processing_time = (time.time() - start_time) * 1000

        response = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "processing_time_ms": round(processing_time, 2),
            "text_analysis": {
                "laterality": list(text_lat),
                "pathologies": list(text_path),
                "keywords_found": list(text_keywords)
            },
            "vision_analysis": {
                "laterality": list(vision_lat),
                "pathologies": list(vision_path),
                "keywords_found": list(vision_keywords),
                "bounding_box": bbox,
                "image_dimensions": {"width": image.width, "height": image.height}
            },
            "cmci_score": round(cmci_score, 2),
            "conflict_detected": conflict_detected,
            "alert_message": alert_message
        }
        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")

@app.get("/api/health")
async def health_check():
    return {"status": "operational", "service": "MedEcho-Verify"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)