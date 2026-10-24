# HeatHealth AI — Supabase connection

## Connected development project

This build is preconfigured for the Supabase project **heathealth-dev** (`llykvjcnhsmipbnzbpbb`) in the Mumbai/India region. The `.env.local` file uses the project URL and its publishable API key. A publishable key is intended for client applications; never put a service-role or secret key in browser code.

## Authentication status

- Supabase project status was checked and is active/healthy.
- The project already has the HeatHealth tables, row-level security policies, and an `auth.users` signup trigger. Existing project migrations are present, so do **not** blindly apply the separate starter SQL migration in this repo over the live project.
- Real email/password Supabase Auth is enabled in the app configuration. Presentation/demo bypass is disabled by default.
- Public signups should be citizens only. Doctor, government, staff and admin roles must be assigned by a trusted administrator in the database; never accept role elevation from signup metadata.

## Before testing sign-in

1. Run `npm install`, then `npm run dev`.
2. Open `/signup` and create a citizen account with an email you control.
3. If email confirmation is enabled in Supabase Auth, confirm the email before signing in at `/login`.
4. In Supabase Auth settings, ensure the site URL and redirect URLs include the local app origin (for example `http://localhost:3000`) and the deployed app URL when deployed.
5. Create professional accounts through Supabase Auth and assign their authorised role in `public.profiles`; do not make them elevated through public signup.

## Model services

- Live weather: Next.js server route `/api/weather` fetches Open-Meteo current conditions and forecasts for Mumbai ward representative coordinates.
- Personal risk: synthetic-data logistic-regression artifact in `ml/artifacts/` runs in the web app. This is a prototype score, not a clinically validated predictor.
- Urine strip detector: train with `ml/train_urine_detector.py`, run `ml/api.py` via Uvicorn, then set `HEATHEALTH_ML_API_URL` in the Next.js environment. Detector weights are not bundled yet.

## Privacy and secrets

Never commit `.env.local`. Only the Supabase publishable key belongs in `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; never expose a service-role key in browser code.
