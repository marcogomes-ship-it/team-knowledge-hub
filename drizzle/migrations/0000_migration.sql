create type public.app_role as enum ('admin','editor','staff');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  team text,
  start_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.can_edit(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','editor'))
$$;
create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id)
$$;

create policy "own roles or admin" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admins manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
grant insert, delete on public.user_roles to authenticated;

create policy "staff read profiles" on public.profiles for select to authenticated using (public.is_staff(auth.uid()));
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- signup restriction + role grant for verified hostify.com emails
create or replace function public.enforce_hostify_domain()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(split_part(new.email,'@',2)) <> 'hostify.com' then
    raise exception 'Only @hostify.com email addresses can sign up';
  end if;
  return new;
end; $$;
create trigger enforce_hostify_domain before insert on auth.users
for each row execute function public.enforce_hostify_domain();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, team, start_date)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'team',
          nullif(new.raw_user_meta_data->>'start_date','')::date)
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.grant_staff_for_verified_domain()
returns trigger language plpgsql security definer set search_path = public as $$
declare is_first boolean;
begin
  if new.email_confirmed_at is not null and lower(split_part(new.email,'@',2)) = 'hostify.com' then
    select not exists (select 1 from public.user_roles where role='admin') into is_first;
    insert into public.user_roles (user_id, role) values (new.id,'staff') on conflict do nothing;
    if is_first then
      insert into public.user_roles (user_id, role) values (new.id,'admin') on conflict do nothing;
    end if;
  end if;
  return new;
end; $$;
create trigger on_auth_user_created_grant after insert on auth.users
for each row execute function public.grant_staff_for_verified_domain();
create trigger on_auth_user_confirmed_grant after update of email_confirmed_at on auth.users
for each row when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
execute function public.grant_staff_for_verified_domain();

-- content
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  category text not null default 'Platform Basics',
  summary text not null default '',
  content text not null default '',
  source text not null default 'Internal',
  source_url text,
  audience text[] not null default '{Everyone}',
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title,'')),'A') ||
    setweight(to_tsvector('english', coalesce(summary,'')),'B') ||
    setweight(to_tsvector('english', coalesce(content,'')),'C')) stored,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index articles_search_idx on public.articles using gin(search);
grant select, insert, update, delete on public.articles to authenticated;
grant all on public.articles to service_role;
alter table public.articles enable row level security;
create policy "staff read articles" on public.articles for select to authenticated using (public.is_staff(auth.uid()));
create policy "editors write articles" on public.articles for all to authenticated using (public.can_edit(auth.uid())) with check (public.can_edit(auth.uid()));

create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  summary text not null default '',
  category text not null default 'Platform Basics',
  steps jsonb not null default '[]',
  article_slug text,
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title,'')),'A') ||
    setweight(to_tsvector('english', coalesce(summary,'')),'B') ||
    setweight(to_tsvector('english', coalesce(steps::text,'')),'C')) stored,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index workflows_search_idx on public.workflows using gin(search);
grant select, insert, update, delete on public.workflows to authenticated;
grant all on public.workflows to service_role;
alter table public.workflows enable row level security;
create policy "staff read workflows" on public.workflows for select to authenticated using (public.is_staff(auth.uid()));
create policy "editors write workflows" on public.workflows for all to authenticated using (public.can_edit(auth.uid())) with check (public.can_edit(auth.uid()));

create table public.onboarding_steps (
  id uuid primary key default gen_random_uuid(),
  position int not null,
  stage text not null,
  title text not null,
  description text not null default '',
  article_slug text,
  workflow_slug text,
  team text not null default 'Everyone'
);
grant select, insert, update, delete on public.onboarding_steps to authenticated;
grant all on public.onboarding_steps to service_role;
alter table public.onboarding_steps enable row level security;
create policy "staff read steps" on public.onboarding_steps for select to authenticated using (public.is_staff(auth.uid()));
create policy "editors write steps" on public.onboarding_steps for all to authenticated using (public.can_edit(auth.uid())) with check (public.can_edit(auth.uid()));

create table public.onboarding_progress (
  user_id uuid not null,
  step_id uuid not null references public.onboarding_steps(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, step_id)
);
grant select, insert, delete on public.onboarding_progress to authenticated;
grant all on public.onboarding_progress to service_role;
alter table public.onboarding_progress enable row level security;
create policy "own progress" on public.onboarding_progress for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.chat_threads to authenticated;
grant all on public.chat_threads to service_role;
alter table public.chat_threads enable row level security;
create policy "own threads" on public.chat_threads for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  user_id uuid not null,
  message_id text not null,
  role text not null,
  message jsonb not null,
  created_at timestamptz not null default now(),
  unique (thread_id, message_id)
);
create index chat_messages_thread_idx on public.chat_messages(thread_id, created_at);
grant select, insert, update, delete on public.chat_messages to authenticated;
grant all on public.chat_messages to service_role;
alter table public.chat_messages enable row level security;
create policy "own messages" on public.chat_messages for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.search_library(q text, max_results int default 30)
returns table (kind text, slug text, title text, category text, summary text, rank real, snippet text)
language sql stable security invoker set search_path = public as $$
  with query as (select websearch_to_tsquery('english', q) as tq)
  select 'article', a.slug, a.title, a.category, a.summary, ts_rank(a.search, query.tq),
         ts_headline('english', a.content, query.tq, 'MaxWords=30,MinWords=12,StartSel=<<,StopSel=>>')
  from public.articles a, query where a.search @@ query.tq
  union all
  select 'workflow', w.slug, w.title, w.category, w.summary, ts_rank(w.search, query.tq) * 1.2,
         ts_headline('english', w.steps::text, query.tq, 'MaxWords=30,MinWords=12,StartSel=<<,StopSel=>>')
  from public.workflows w, query where w.search @@ query.tq
  order by 6 desc limit max_results
$$;
grant execute on function public.search_library(text,int) to authenticated;