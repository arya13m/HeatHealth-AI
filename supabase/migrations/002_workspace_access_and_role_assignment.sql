-- HeatHealth AI workspace access controls. Applied to heathealth-dev on 2026-10-24.
-- Default role is citizen; the three named accounts are assigned fixed roles by email.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $function$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  assigned_role text := case lower(coalesce(new.email,''))
    when 'ankita.kotkar@somaiya.edu' then 'government'
    when 'palak.kumar@somaiya.edu' then 'doctor'
    when 'aryamenon1330@gmail.com' then 'staff'
    else 'citizen' end;
begin
  insert into public.profiles(id,email,full_name,role)
  values(new.id,new.email,coalesce(m->>'full_name',''),assigned_role)
  on conflict(id) do update set email=excluded.email,
    full_name=coalesce(nullif(excluded.full_name,''),public.profiles.full_name),
    role=case when lower(coalesce(excluded.email,'')) in
      ('ankita.kotkar@somaiya.edu','palak.kumar@somaiya.edu','aryamenon1330@gmail.com')
      then assigned_role else public.profiles.role end;
  insert into public.citizen_profiles(user_id,age,locality,activity_level,caregivers,heat_exposure,
    water_intake_liters,symptoms,hydration_target_liters,reminders_enabled,wake_time,sleep_time)
  values(new.id,nullif(m->>'age','')::int,coalesce(m->>'locality','Mumbai'),
    coalesce(m->>'activity_level','Light outdoor'),coalesce(m->>'caregivers','Just me'),
    coalesce(array(select jsonb_array_elements_text(coalesce(m->'heat_exposure','[]'::jsonb))),'{}'::text[]),
    nullif(m->>'water_intake_liters','')::numeric,coalesce(m->'symptoms','{}'::jsonb),
    coalesce(nullif(m->>'hydration_target_liters','')::numeric,2.5),
    coalesce(nullif(m->>'reminders_enabled','')::boolean,true),nullif(m->>'wake_time','')::time,
    nullif(m->>'sleep_time','')::time) on conflict(user_id) do nothing;
  return new;
end; $function$;

-- Existing profiles are repaired and the known existing Palak account is assigned doctor.
insert into public.profiles(id,email,full_name,role)
select u.id,u.email,coalesce(u.raw_user_meta_data->>'full_name',''),
 case lower(coalesce(u.email,'')) when 'ankita.kotkar@somaiya.edu' then 'government'
 when 'palak.kumar@somaiya.edu' then 'doctor' when 'aryamenon1330@gmail.com' then 'staff' else 'citizen' end
from auth.users u on conflict(id) do update set email=excluded.email,
 role=case when lower(coalesce(excluded.email,'')) in
 ('ankita.kotkar@somaiya.edu','palak.kumar@somaiya.edu','aryamenon1330@gmail.com')
 then excluded.role else coalesce(public.profiles.role,'citizen') end,updated_at=now();
insert into public.citizen_profiles(user_id,locality,activity_level,caregivers,heat_exposure,symptoms,hydration_target_liters,reminders_enabled)
select p.id,'Mumbai','Light outdoor','Just me','{}','{}'::jsonb,2.5,true from public.profiles p
on conflict(user_id) do nothing;
update public.profiles set role='doctor',updated_at=now() where lower(email)='palak.kumar@somaiya.edu';

-- Access requests: users cannot grant themselves a role; only government can approve.
create table if not exists public.access_requests(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 requested_role text not null check(requested_role in ('doctor','staff')),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(), reviewed_at timestamptz,
 reviewed_by uuid references public.profiles(id), requester_email text, requester_name text,
 unique(user_id,requested_role));
alter table public.access_requests enable row level security;
drop policy if exists access_requests_own_read on public.access_requests;
create policy access_requests_own_read on public.access_requests for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists access_requests_own_insert on public.access_requests;
create policy access_requests_own_insert on public.access_requests for insert to authenticated with check(user_id=(select auth.uid()));
drop policy if exists access_requests_government_read on public.access_requests;
create policy access_requests_government_read on public.access_requests for select to authenticated using(
 exists(select 1 from public.profiles me where me.id=(select auth.uid()) and me.role='government'));
grant select,insert on public.access_requests to authenticated;
drop policy if exists government_profiles_read on public.profiles;

create or replace function public.request_workspace_access(requested_role text) returns void
language plpgsql security definer set search_path=public as $function$
declare current_user_id uuid := (select auth.uid()); current_email text; current_name text;
begin
 if current_user_id is null then raise exception 'Please sign in first'; end if;
 if requested_role not in ('doctor','staff') then raise exception 'Only doctor or staff access can be requested'; end if;
 if not exists(select 1 from public.profiles p where p.id=current_user_id and p.role='citizen') then
  raise exception 'Only citizen accounts can request additional workspace access'; end if;
 select u.email,coalesce(u.raw_user_meta_data->>'full_name','') into current_email,current_name
 from auth.users u where u.id=current_user_id;
 insert into public.access_requests(user_id,requested_role,status,requester_email,requester_name)
 values(current_user_id,requested_role,'pending',current_email,current_name)
 on conflict(user_id,requested_role) do update set status='pending',created_at=now(),reviewed_at=null,
 reviewed_by=null,requester_email=excluded.requester_email,requester_name=excluded.requester_name;
end; $function$;
revoke all on function public.request_workspace_access(text) from public,anon;
grant execute on function public.request_workspace_access(text) to authenticated;

create or replace function public.list_workspace_access_requests() returns table(
 id uuid,user_id uuid,requester_email text,requester_name text,requested_role text,status text,created_at timestamptz)
language plpgsql security definer set search_path=public as $function$
begin
 if not exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='government') then
  raise exception 'Only an authorised government account can review workspace requests'; end if;
 return query select r.id,r.user_id,r.requester_email,r.requester_name,r.requested_role,r.status,r.created_at
 from public.access_requests r order by r.created_at desc;
end; $function$;
revoke all on function public.list_workspace_access_requests() from public,anon;
grant execute on function public.list_workspace_access_requests() to authenticated;

create or replace function public.approve_workspace_access(target_request_id uuid, approved boolean) returns void
language plpgsql security definer set search_path=public as $function$
declare req public.access_requests%rowtype;
begin
 if not exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='government') then
  raise exception 'Only an authorised government account can approve workspace access'; end if;
 select * into req from public.access_requests where id=target_request_id and status='pending' for update;
 if not found then raise exception 'Pending access request not found'; end if;
 if approved then update public.profiles set role=req.requested_role,updated_at=now() where id=req.user_id;
  update public.access_requests set status='approved',reviewed_at=now(),reviewed_by=(select auth.uid()) where id=req.id;
 else update public.access_requests set status='rejected',reviewed_at=now(),reviewed_by=(select auth.uid()) where id=req.id; end if;
end; $function$;
revoke all on function public.approve_workspace_access(uuid,boolean) from public,anon;
grant execute on function public.approve_workspace_access(uuid,boolean) to authenticated;
