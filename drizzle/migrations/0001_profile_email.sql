alter table public.profiles add column if not exists email text;
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, team, start_date)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'team',
          nullif(new.raw_user_meta_data->>'start_date','')::date)
  on conflict (id) do nothing;
  return new;
end; $$;