from pathlib import Path
import os
from typing import Any
import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from ultralytics import YOLO

ROOT = Path(__file__).resolve().parent
WEIGHTS = Path(os.environ.get('HEATHEALTH_MODEL_PATH', str(ROOT / 'weights' / 'best.pt')))
MAX_BYTES = 12 * 1024 * 1024
app = FastAPI(title='HeatHealth Urine Strip Pad Detector', version='0.1.0')
_model = None

@app.get('/health')
def health():
    return {'status': 'ready' if WEIGHTS.exists() else 'model_not_trained', 'weights_present': WEIGHTS.exists(), 'task': 'strip and reagent-pad object detection only'}

@app.post('/analyze')
async def analyze(file: UploadFile = File(...)) -> dict[str, Any]:
    global _model
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(415, 'Upload a supported image file.')
    content = await file.read()
    if not content or len(content) > MAX_BYTES:
        raise HTTPException(413, 'Image is empty or exceeds 12 MB.')
    if not WEIGHTS.exists():
        raise HTTPException(503, 'Detector weights are not trained yet. Run python train_urine_detector.py first.')
    if _model is None:
        _model = YOLO(str(WEIGHTS))
    arr = np.frombuffer(content, np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(400, 'Could not decode this image.')
    h, w = image.shape[:2]
    if max(h, w) > 2400:
        scale = 2400 / max(h, w)
        image = cv2.resize(image, (int(w*scale), int(h*scale)))
        h, w = image.shape[:2]
    result = _model.predict(source=image, imgsz=512, conf=0.25, verbose=False)[0]
    names = result.names
    detections = []
    if result.boxes is not None:
        for box in result.boxes:
            x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].cpu().numpy().tolist()]
            x1, y1 = max(0,x1), max(0,y1); x2, y2 = min(w,x2), min(h,y2)
            if x2 <= x1 or y2 <= y1: continue
            crop = image[y1:y2, x1:x2]
            mean_bgr = crop.reshape(-1,3).mean(axis=0) if crop.size else np.array([0,0,0])
            rgb = [int(round(v)) for v in mean_bgr[::-1]]
            cls = int(box.cls[0].item())
            detections.append({'analyte': names.get(cls, str(cls)), 'confidence': round(float(box.conf[0].item()),4), 'box_xyxy':[x1,y1,x2,y2], 'mean_rgb':rgb, 'color_hex':'#%02x%02x%02x'%tuple(rgb)})
    detections.sort(key=lambda d: (d['analyte'] == 'strip', d['box_xyxy'][1], d['box_xyxy'][0]))
    return {
      'status':'detected' if detections else 'no_detections', 'source':'yolov8-pad-detector',
      'image_width':w, 'image_height':h, 'detections':detections,
      'interpretation':'Object detection only: the model locates annotated strip/pad classes and reports mean image colour. The supplied labels do not encode analyte concentration levels. Verify the manufacturer-specific colour chart, pad read time and lighting; no diagnosis is generated.',
      'warning':'Not clinically validated. Raw colour values are affected by camera, lighting, strip brand, timing and image processing.'
    }
