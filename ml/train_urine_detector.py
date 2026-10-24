"""Train a YOLOv8 pad/strip detector from the supplied Roboflow-format dataset.

The annotations identify object/pad classes, not measured analyte concentration levels.
This model therefore detects strip/pad locations only; it does not diagnose or infer values.
"""
from pathlib import Path
import zipfile
import yaml
import torch
from ultralytics import YOLO

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'datasets' / 'urine-strip-source.zip'
DATA_DIR = ROOT / 'datasets' / 'urine-strip-data'
OUT = ROOT / 'weights'
OUT.mkdir(exist_ok=True)
if not (DATA_DIR / 'data.yaml').exists():
    if not SOURCE.exists():
        raise FileNotFoundError(f'Missing {SOURCE}. Put the supplied Urine Test Strips ZIP there.')
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(SOURCE) as zf:
        zf.extractall(DATA_DIR)
# Some Roboflow archives place data.yaml at root but store paths as ../train/images.
# Rewrite paths to match the extracted folder structure.
source_yaml = DATA_DIR / 'data.yaml'
raw = yaml.safe_load(source_yaml.read_text())
config = {
    'path': str(DATA_DIR),
    'train': 'train/images',
    'val': 'valid/images',
    'test': 'test/images',
    'nc': int(raw['nc']),
    'names': raw['names'],
}
fixed_yaml = DATA_DIR / 'heathealth_data.yaml'
fixed_yaml.write_text(yaml.safe_dump(config, sort_keys=False))
model = YOLO('yolov8n.pt')  # downloads the small pretrained base weights on first run
device = 0 if torch.cuda.is_available() else 'cpu'
batch = 16 if torch.cuda.is_available() else 4
model.train(data=str(fixed_yaml), epochs=80, imgsz=512, batch=batch, patience=15, workers=2,
            project=str(ROOT / 'runs'), name='urine-pad-detector', device=device, plots=True, seed=42)
best = ROOT / 'runs' / 'urine-pad-detector' / 'weights' / 'best.pt'
if not best.exists():
    raise FileNotFoundError(f'Training finished without expected weights at {best}')
(OUT / 'best.pt').write_bytes(best.read_bytes())
print(f'Model saved to {OUT / "best.pt"}')
print('Important: validate detection metrics on the held-out test split and assess external camera/lighting performance.')
print('The dataset labels pad identity/location, not concentration values; do not describe this as a clinically validated biomarker reader.')
