
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  company text,
  role text,
  notes text,
  status text check (status in ('New', 'Contacted', 'Qualified', 'Lost', 'Meeting', 'Won', 'Met', 'Follow-up', 'Engaged', 'Outcome')) default 'New',
  reminder_date timestamptz,
  owner_id uuid,
  captured_at timestamptz default now(), 
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  social_media_json jsonb default '{}'::jsonb, 
  meta_data jsonb default '{}'::jsonb, 
  revenue numeric default 0,
  conference_id uuid,
  
  
  constraint leads_email_unique unique (email)
);


create table public.interactions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade on update cascade,
  type text check (type in ('Call', 'Email', 'Meeting', 'Note', 'Sync')),
  summary text,
  date timestamptz default now(),
  
  
  recording_url text,
  meta_data jsonb default '{}'::jsonb,
  
  created_at timestamptz default now()
);

create index leads_status_idx on public.leads(status);
create index leads_phone_idx on public.leads(phone);
create index interactions_lead_id_idx on public.interactions(lead_id);

alter table public.leads enable row level security;
alter table public.interactions enable row level security;


create policy "Enable access for service role" on public.leads
    as permissive for all
    to service_role
    using (true)
    with check (true);

create policy "Enable access for service role" on public.interactions
    as permissive for all
    to service_role
    using (true)
    with check (true);
create table public.conferences (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cost numeric not null,
  date timestamptz default now()
);

alter table public.conferences enable row level security;
create policy "Enable access for service role" on public.conferences as permissive for all to service_role using (true) with check (true);
