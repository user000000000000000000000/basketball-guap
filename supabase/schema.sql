-- Запустить целиком в Supabase → SQL Editor → New query → Run

create type user_role as enum ('student', 'admin');
create type att_status as enum ('present', 'absent');

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role user_role not null default 'student',
  full_name text not null default '',
  "group" text not null default '',
  phone text not null default '',
  email text not null default ''
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  lat float8,
  lng float8,
  check (end_time > start_time)
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  event_id uuid not null references public.events on delete cascade,
  created_at timestamptz not null default now(),
  status att_status not null default 'present',
  unique (user_id, event_id)
);

-- Профиль создаётся автоматически при регистрации
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, coalesce(new.email, ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- security definer, чтобы политики не уходили в рекурсию
create function public.my_role() returns user_role
language sql security definer stable set search_path = public as
  $$ select role from public.profiles where id = auth.uid() $$;

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.attendance enable row level security;

-- profiles
create policy "own or admin read" on public.profiles for select
  using (id = auth.uid() or public.my_role() = 'admin');
create policy "own update, role is locked" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and role = public.my_role());
create policy "admin update" on public.profiles for update
  using (public.my_role() = 'admin');

-- events
create policy "all read" on public.events for select to authenticated using (true);
create policy "admin write" on public.events for all
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- attendance
create policy "own or admin read" on public.attendance for select
  using (user_id = auth.uid() or public.my_role() = 'admin');
create policy "student marks self" on public.attendance for insert
  with check (user_id = auth.uid() and status = 'present');
create policy "admin write" on public.attendance for all
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- Назначить менеджера (после его регистрации):
-- update public.profiles set role = 'admin' where email = 'manager@example.com';
