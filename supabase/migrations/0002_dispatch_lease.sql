create table if not exists dispatch_leases (
  id int primary key,
  holder text not null,
  expires_at timestamptz not null
);

create or replace function acquire_dispatch_lease(p_holder text, p_ttl_seconds int default 20)
returns boolean
language plpgsql
security definer
as $$
declare
  acquired int;
begin
  insert into dispatch_leases (id, holder, expires_at)
  values (1, p_holder, now() + make_interval(secs => greatest(5, least(p_ttl_seconds, 120))))
  on conflict (id)
  do update set
    holder = excluded.holder,
    expires_at = excluded.expires_at
  where dispatch_leases.expires_at <= now()
  returning 1 into acquired;

  return acquired = 1;
end;
$$;

create or replace function release_dispatch_lease(p_holder text)
returns boolean
language plpgsql
security definer
as $$
declare
  released int;
begin
  update dispatch_leases
  set expires_at = now()
  where id = 1 and holder = p_holder
  returning 1 into released;

  return released = 1;
end;
$$;

alter table dispatch_leases enable row level security;
