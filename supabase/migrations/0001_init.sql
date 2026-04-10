create extension if not exists pgcrypto;

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_at timestamptz not null default now(),
  client_request_id text unique,
  source text not null,
  name text not null,
  phone text not null,
  concern text not null,
  protect_target text not null,
  needed_thing text not null,
  interests jsonb not null default '[]'::jsonb,
  generated_message text not null,
  user_agent text not null default '',
  send_status text not null default 'PENDING',
  send_error text,
  send_meta jsonb,
  share_image_key text
);

create table if not exists submission_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  status text not null default 'PENDING',
  attempt_count int not null default 0,
  next_retry_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id)
);

create table if not exists message_jobs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  provider text not null,
  status text not null default 'PENDING',
  attempt_count int not null default 0,
  next_retry_at timestamptz not null default now(),
  last_error text,
  provider_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id)
);

create table if not exists share_image_jobs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  status text not null default 'PENDING',
  attempt_count int not null default 0,
  next_retry_at timestamptz not null default now(),
  last_error text,
  asset_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id)
);

create table if not exists aggregate_counters (
  pk text not null,
  sk text not null,
  count bigint not null default 0,
  primary key (pk, sk)
);

create index if not exists idx_submission_events_pending on submission_events (status, next_retry_at, created_at);
create index if not exists idx_message_jobs_pending on message_jobs (status, next_retry_at, created_at);
create index if not exists idx_share_image_jobs_pending on share_image_jobs (status, next_retry_at, created_at);

create or replace function increment_counter(p_pk text, p_sk text, p_delta int default 1)
returns void
language plpgsql
security definer
as $$
begin
  insert into aggregate_counters (pk, sk, count)
  values (p_pk, p_sk, p_delta)
  on conflict (pk, sk)
  do update set count = aggregate_counters.count + excluded.count;
end;
$$;

create or replace function claim_submission_events(p_limit int default 20)
returns table (id uuid, submission_id uuid, attempt_count int)
language plpgsql
security definer
as $$
begin
  return query
  with claimed as (
    select se.id
    from submission_events se
    where se.status = 'PENDING'
      and se.next_retry_at <= now()
    order by se.created_at asc
    for update skip locked
    limit p_limit
  )
  update submission_events se
  set status = 'PROCESSING',
      updated_at = now()
  from claimed
  where se.id = claimed.id
  returning se.id, se.submission_id, se.attempt_count;
end;
$$;

create or replace function claim_message_jobs(p_limit int default 20)
returns table (id uuid, submission_id uuid, attempt_count int)
language plpgsql
security definer
as $$
begin
  return query
  with claimed as (
    select mj.id
    from message_jobs mj
    where mj.status = 'PENDING'
      and mj.next_retry_at <= now()
    order by mj.created_at asc
    for update skip locked
    limit p_limit
  )
  update message_jobs mj
  set status = 'PROCESSING',
      updated_at = now()
  from claimed
  where mj.id = claimed.id
  returning mj.id, mj.submission_id, mj.attempt_count;
end;
$$;

create or replace function claim_share_image_jobs(p_limit int default 20)
returns table (id uuid, submission_id uuid, attempt_count int)
language plpgsql
security definer
as $$
begin
  return query
  with claimed as (
    select sij.id
    from share_image_jobs sij
    where sij.status = 'PENDING'
      and sij.next_retry_at <= now()
    order by sij.created_at asc
    for update skip locked
    limit p_limit
  )
  update share_image_jobs sij
  set status = 'PROCESSING',
      updated_at = now()
  from claimed
  where sij.id = claimed.id
  returning sij.id, sij.submission_id, sij.attempt_count;
end;
$$;

alter table submissions enable row level security;
alter table submission_events enable row level security;
alter table message_jobs enable row level security;
alter table share_image_jobs enable row level security;
alter table aggregate_counters enable row level security;
