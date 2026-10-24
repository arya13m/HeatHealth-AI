# Supabase setup

1. Create/open the Supabase project.
2. Copy `.env.local.example` to `.env.local` and fill in the project URL and publishable key.
3. Review and run `migrations/001_heathealth_schema.sql` in Supabase SQL Editor.
4. Test signup, email confirmation, login, password reset, role routing and RLS with separate accounts.
5. Assign professional roles using a trusted administrator workflow. Public signup always creates a citizen role.

The migration defines profiles, citizen profiles, hydration logs, health check-ins, urine screening records, alerts, hotspots, dispatch tasks and referrals. It does not seed real patient or facility records.
