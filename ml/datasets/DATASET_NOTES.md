# Urine strip dataset notes

The included archive is the user-provided Roboflow export `Urine Test Strips -Main-.v23i.yolov8.zip` (dataset version 23, exported 10 Aug 2026). Its README reports 2,715 images and YOLOv8 object annotations. Classes: Bilirubin, Blood, Glucose, Ketone, Leukocytes, Nitrite, Protein, SpGravity, Urobilinogen, background, pH, strip.

The export's README reports its license as undefined and the Roboflow metadata marks the project private. Confirm permission to use the dataset for research, redistribution, training and publication before sharing the app ZIP or publishing model weights. This package includes it only because the uploader supplied it for this project.

Annotations mark pad/strip locations and identity; they do not supply paired laboratory reference values or concentration-grade labels. Therefore this dataset can train a detector, not a validated quantitative biomarker reader.
