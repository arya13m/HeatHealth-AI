-- HeatHealth AI schema baseline. Review with your Supabase project before applying.
create extension if not exists pgcrypto;
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade, email text, full_name text,
 role text not null default 'citizen' check (role in ('citizen','doctor','government','staff','admin')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.citizen_profiles (
 user_id uuid primary key references public.profiles(id) on delete cascade, age integer,
 locality text default 'Mumbai', activity_level text default 'Mostly indoors', caregivers text default 'Just me',
 heat_exposure text[] not null default '{}', water_intake_liters numeric(4,2) default 2,
 hydration_target_liters numeric(4,2) default 2.5, reminders_enabled boolean not null default true,
 wake_time text, sleep_time text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.hydration_logs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 amount_ml integer not null check (amount_ml > 0 and amount_ml <= 2000), logged_at timestamptz not null default now()
);
create table if not exists public.health_checkins (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 energy text, thirst text, dizziness text, headache text, nausea text, sweating text, created_at timestamptz not null default now()
);
create table if not exists public.urine_screenings (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 patient_id uuid references public.profiles(id) on delete set null, hydration_signal text not null default 'pending_clinical_review',
 measured_values jsonb not null default '{}'::jsonb, recommendation text,
 consented_to_clinical_review boolean not null default false, created_at timestamptz not null default now()
);
alter table public.urine_screenings add column if not exists patient_id uuid references public.profiles(id) on delete set null;
alter table public.urine_screenings add column if not exists consented_to_clinical_review boolean not null default false;
create table if not exists public.alerts (
 id uuid primary key default gen_random_uuid(), title text not null, message text, severity text not null default 'info',
 audience_role text[] not null default array['citizen']::text[], locality text, is_active boolean not null default true,
 created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now()
);
create table if not exists public.hotspots (
 id uuid primary key default gen_random_uuid(), locality text not null unique, ward_id text,
 heat_risk text not null default 'monitor', health_signal_change_pct numeric(6,2) not null default 0,
 screening_events integer not null default 0, exposure_score numeric(6,2) not null default 0,
 resource_coverage_pct numeric(6,2) not null default 0, status text not null default 'monitoring',
 recommended_actions jsonb not null default '[]'::jsonb, updated_at timestamptz not null default now()
);
create table if not exists public.dispatch_tasks (
 id uuid primary key default gen_random_uuid(), title text not null, description text, location text, resource_type text,
 priority text not null default 'normal', status text not null default 'queued' check (status in ('queued','accepted','en_route','arrived','deployed','completed','cancelled')),
 assigned_to uuid references public.profiles(id) on delete set null, created_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.referrals (
 id uuid primary key default gen_random_uuid(), patient_id uuid references public.profiles(id) on delete set null,
 created_by uuid references public.profiles(id) on delete set null, facility_name text, reason text,
 status text not null default 'open', created_at timestamptz not null default now()
);
create or replace function public.current_app_role() returns text language sql stable security definer set search_path = public as $$ select role from public.profiles where id = auth.uid() $$;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
 insert into public.profiles(id,email,full_name,role) values(new.id,new.email,coalesce(m->>'full_name','Citizen'),'citizen')
 on conflict(id) do update set email=excluded.email,full_name=coalesce(excluded.full_name,public.profiles.full_name);
 insert into public.citizen_profiles(user_id,age,locality,activity_level,caregivers,heat_exposure,water_intake_liters,hydration_target_liters,reminders_enabled,wake_time,sleep_time)
 values(new.id,nullif(m->>'age','')::integer,coalesce(m->>'locality','Mumbai'),coalesce(m->>'activity_level','Mostly indoors'),coalesce(m->>'caregivers','Just me'),array(select jsonb_array_elements_text(coalesce(m->'heat_exposure','[]'::jsonb))),nullif(m->>'water_intake_liters','')::numeric,nullif(m->>'hydration_target_liters','')::numeric,coalesce((m->>'reminders_enabled')::boolean,true),m->>'wake_time',m->>'sleep_time') on conflict(user_id) do nothing;
 return new;
end; $$;
drop trigger if exists on_auth_user_created_heathealth on auth.users;
create trigger on_auth_user_created_heathealth after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.citizen_profiles enable row level security;
alter table public.hydration_logs enable row level security;
alter table public.health_checkins enable row level security;
alter table public.urine_screenings enable row level security;
alter table public.alerts enable row level security;
alter table public.hotspots enable row level security;
alter table public.dispatch_tasks enable row level security;
alter table public.referrals enable row level security;

drop policy if exists profiles_read_self_or_admin on public.profiles;
create policy profiles_read_self_or_admin on public.profiles for select to authenticated using (id=auth.uid() or public.current_app_role()='admin');
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid() and role=public.current_app_role());
-- Column grants prevent self-service role changes even if a client submits a crafted update.
revoke update on public.profiles from authenticated;
grant update(full_name,email) on public.profiles to authenticated;
drop policy if exists citizen_profile_self on public.citizen_profiles;
create policy citizen_profile_self on public.citizen_profiles for all to authenticated using (user_id=auth.uid() or public.current_app_role()='admin') with check (user_id=auth.uid() or public.current_app_role()='admin');
drop policy if exists hydration_self on public.hydration_logs;
create policy hydration_self on public.hydration_logs for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists checkins_self on public.health_checkins;
create policy checkins_self on public.health_checkins for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists screenings_owner on public.urine_screenings;
create policy screenings_owner on public.urine_screenings for select to authenticated using (user_id=auth.uid());
drop policy if exists screenings_insert_owner on public.urine_screenings;
create policy screenings_insert_owner on public.urine_screenings for insert to authenticated with check (user_id=auth.uid());
drop policy if exists screenings_update_owner on public.urine_screenings;
create policy screenings_update_owner on public.urine_screenings for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists screenings_clinician_consent on public.urine_screenings;
create policy screenings_clinician_consent on public.urine_screenings for select to authenticated using (consented_to_clinical_review=true and public.current_app_role() in ('doctor','admin'));
drop policy if exists alerts_read_role on public.alerts;
create policy alerts_read_role on public.alerts for select to authenticated using (is_active=true and (public.current_app_role()=any(audience_role) or public.current_app_role() in ('admin','government')));
drop policy if exists alerts_manage_gov on public.alerts;
create policy alerts_manage_gov on public.alerts for all to authenticated using (public.current_app_role() in ('admin','government')) with check (public.current_app_role() in ('admin','government'));
drop policy if exists hotspots_read_ops on public.hotspots;
create policy hotspots_read_ops on public.hotspots for select to authenticated using (public.current_app_role() in ('doctor','government','admin'));
drop policy if exists hotspots_manage_gov on public.hotspots;
create policy hotspots_manage_gov on public.hotspots for all to authenticated using (public.current_app_role() in ('government','admin')) with check (public.current_app_role() in ('government','admin'));
drop policy if exists dispatch_read_staff on public.dispatch_tasks;
create policy dispatch_read_staff on public.dispatch_tasks for select to authenticated using (public.current_app_role() in ('staff','government','admin'));
drop policy if exists dispatch_update_staff on public.dispatch_tasks;
create policy dispatch_update_staff on public.dispatch_tasks for update to authenticated using (public.current_app_role() in ('staff','government','admin')) with check (public.current_app_role() in ('staff','government','admin'));
drop policy if exists dispatch_insert_ops on public.dispatch_tasks;
create policy dispatch_insert_ops on public.dispatch_tasks for insert to authenticated with check (public.current_app_role() in ('staff','government','admin'));
drop policy if exists referrals_clinical on public.referrals;
create policy referrals_clinical on public.referrals for all to authenticated using (public.current_app_role() in ('doctor','admin')) with check (public.current_app_role() in ('doctor','admin'));
-- Professional roles must be assigned by a trusted administrator, never from public signup metadata.
