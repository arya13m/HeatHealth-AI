# HeatHealth AI — application build

This package contains the Next.js app, Supabase auth/database setup, live Mumbai ward weather, a synthetic-data personalized-risk demonstrator, and the urine-strip object-detection training/inference pipeline.

## Start the web app

1. Install Node.js 20+.
2. Copy `.env.local.example` to `.env.local` and add your Supabase URL and publishable key.
3. In Supabase SQL Editor, review and apply `supabase/migrations/001_heathealth_schema.sql`.
4. Run `npm install`, then `npm run dev`.
5. Open `http://localhost:3000`.

Citizen accounts are created through Supabase Auth. New signups receive the citizen role. Doctor, government and staff roles must be assigned by an administrator in `public.profiles`; public signup cannot grant elevated access. Local demo sessions can be enabled with the two demo flags in `.env.local`; middleware explicitly disables this bypass in production.

## Live weather

`/api/weather` calls the Open-Meteo forecast API server-side. Select a Mumbai ward to fetch current conditions, hourly apparent temperature/humidity/UV and a 3-day forecast. If the provider is unavailable, the UI shows an error instead of inventing live values. The uploaded NASA POWER CSV is historical context, not a live forecast source.

## Personalised heat-risk model

- `ml/train_personalized_risk.py` generates 12,000 synthetic examples, trains a logistic regression and exports the model to `ml/artifacts/personalized_heat_risk_model.json`.
- The browser applies the exported coefficients to current apparent temperature/humidity plus profile-reported age, activity, exposure, hydration and symptoms.
- `ml/artifacts/synthetic_personalized_risk_training.csv` is synthetic training data.
- `ml/artifacts/MODEL_CARD.md` documents the synthetic-only holdout metrics and limitations.

**This score is a software demonstrator, not a clinically validated predictor.** The training labels are generated from a heuristic, not observed patient outcomes. Do not use the score for diagnosis, triage or autonomous public-health decisions. Replace synthetic labels with ethically approved and independently reviewed data before any real-world evaluation.

## Urine-strip image detector

The supplied YOLOv8 dataset is included at `ml/datasets/urine-strip-source.zip`.

1. Use Python 3.10 or 3.11 in a separate environment.
2. `cd ml && python -m venv .venv`; activate it and run `pip install -r requirements.txt`.
3. Run `python train_urine_detector.py`. This extracts the supplied dataset, trains YOLOv8 on CPU and writes `ml/weights/best.pt`. The first run downloads the small pretrained base model, so internet access is required. For a GPU, edit the `device`/batch settings in the training script.
4. Start the inference service from `ml/`: `uvicorn api:app --host 127.0.0.1 --port 8001`.
5. Set `HEATHEALTH_ML_API_URL=http://127.0.0.1:8001` in the web app `.env.local` and restart Next.js.
6. Check `http://127.0.0.1:8001/health` and try the scanner from Citizen or Doctor workspace.

The supplied dataset's 12 classes identify the strip and reagent-pad locations. Its labels do **not** encode quantitative analyte concentration or clinical diagnosis. The service returns bounding boxes and mean RGB colour features only; the app lets a human record readings from the correct manufacturer's colour chart. Camera, light, strip brand and read timing need controlled calibration. The bundled synthetic scan button is a UI demo and is explicitly labelled synthetic; it is not an image inference result.

## Supabase and privacy

The migration enables RLS on personal and operational tables. Citizen screening records are private to their owner unless the consent flag is set for clinical review. Doctor scanner saves under the clinician's authenticated account and can optionally link a patient UUID after identity/consent checks. Government/doctor hotspot views are intended for aggregated locality data; do not store individual health readings in the hotspot table.

Before deployment, review the migration against your existing Supabase schema, test RLS with separate user roles, configure auth redirect URLs and email confirmation, and never expose a Supabase service-role key to the browser. Demo mode must remain disabled in production.

## Included source inputs

- `src/data/mumbai-wards.json`: compact forecast coordinates derived from the uploaded ward GeoJSON.
- `ml/datasets/urine-strip-source.zip`: user-provided annotated urine-strip dataset.
- `ml/artifacts/synthetic_personalized_risk_training.csv`: generated synthetic training data.
- Original NASA POWER CSV and IMD PDF are included in `reference-data/` for traceability; they are not used as live forecast data.

## Workspace roles and account access (heathealth-dev)

- Public signup creates citizen accounts only; the signup UI does not expose workspace-role selection or database-provider wording.
- The database signup trigger assigns the fixed roles `ankita.kotkar@somaiya.edu` → government, `palak.kumar@somaiya.edu` → doctor, and `aryamenon1330@gmail.com` → staff. All other new accounts default to citizen. The existing Palak profile was updated to doctor. Ankita and aryamenon1330 need to register with those exact email addresses if they do not already have accounts.
- Sign-in reads the stored profile role and redirects automatically to the matching dashboard.
- Citizens can request doctor/staff access from `/citizen/access`. Government users can approve/reject requests from `/government/access`; approval is enforced in database functions, not only by hiding UI controls.
- The role allow-list is deliberately fixed in the database trigger. Do not allow client-provided user metadata to set roles.
- Weather data is fetched live from Open-Meteo and refreshed on a 10-minute interval while the panel is open, with a manual refresh option.
- The personalised heat-risk score consumes signup profile values (age, activity, exposure, reported water intake and symptoms) with current forecast temperature/humidity. Its logistic-regression parameters were trained on synthetic, heuristic-labelled data only; this is a prototype score, not a clinically validated model.
- The urine-strip dataset and training/inference scripts are included, but trained YOLO urine-detector weights are not yet included. Do not describe the urine model as trained until a training run produces and verifies the weights.
