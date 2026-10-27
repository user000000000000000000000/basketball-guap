-- Мульти-секции: секции, тренеры секций, участники секций. Запускать целиком в SQL Editor.
-- Роли: profiles.role = 'admin' — главный админ (видит и правит всё); тренер — запись в section_coaches.

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#1c3f94',
  schedule jsonb not null default '[]',   -- недельное расписание: [{"dow":1,"start":"20:00","end":"21:00"}], dow: 1=пн … 0=вс
  lat float8,                              -- координаты зала секции (для проверки геолокации)
  lng float8,
  created_at timestamptz not null default now()
);

create table public.section_coaches (
  section_id uuid not null references public.sections on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  primary key (section_id, user_id)
);

create table public.section_members (
  section_id uuid not null references public.sections on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  primary key (section_id, user_id)
);

-- секции: баскетбол (с текущим расписанием и залом) + остальные из чата ССК
insert into public.sections (name, color, schedule, lat, lng) values
  ('Баскетбол', '#ea580c',
   '[{"dow":1,"start":"20:00","end":"21:00"},{"dow":1,"start":"21:00","end":"22:00"},{"dow":3,"start":"20:00","end":"21:00"},{"dow":3,"start":"21:00","end":"22:00"}]'::jsonb,
   (select lat from public.events where lat is not null order by date desc limit 1),
   (select lng from public.events where lng is not null order by date desc limit 1));
insert into public.sections (name, color) values
  ('Автоспорт', '#475569'), ('Боулинг', '#7c3aed'), ('Гребной спорт', '#0284c7'), ('Го', '#0f766e'),
  ('Бильярд', '#15803d'), ('Шахматы', '#334155'), ('Шашки', '#b45309'), ('Дартс', '#dc2626'),
  ('Плавание', '#0891b2'), ('Спортивный туризм', '#65a30d'), ('Бадминтон', '#db2777'),
  ('Парусный спорт', '#1d4ed8'), ('Футбол', '#16a34a'), ('Волейбол', '#d97706');

-- занятия привязываем к секции (все существующие — баскетбол)
alter table public.events add column section_id uuid references public.sections on delete cascade;
update public.events set section_id = (select id from public.sections where name = 'Баскетбол');
alter table public.events alter column section_id set not null;

-- те, кто уже отмечался, — участники баскетбола
insert into public.section_members (section_id, user_id)
  select distinct (select id from public.sections where name = 'Баскетбол'), user_id from public.attendance
  on conflict do nothing;

-- helpers (security definer, чтобы политики не уходили в рекурсию)
create function public.is_admin() returns boolean
language sql security definer stable set search_path = public as
  $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;

create function public.is_coach_of(sid uuid) returns boolean
language sql security definer stable set search_path = public as
  $$ select exists (select 1 from public.section_coaches where section_id = sid and user_id = auth.uid()) $$;

-- тренер видит профили своих участников и тех, кто отмечался на его занятиях
create function public.coaches_student(uid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.section_coaches sc join public.section_members sm on sm.section_id = sc.section_id
                 where sc.user_id = auth.uid() and sm.user_id = uid)
      or exists (select 1 from public.attendance a join public.events e on e.id = a.event_id
                 join public.section_coaches sc on sc.section_id = e.section_id
                 where a.user_id = uid and sc.user_id = auth.uid()) $$;

alter table public.sections enable row level security;
alter table public.section_coaches enable row level security;
alter table public.section_members enable row level security;

-- старые политики заменяем
drop policy "all read" on public.events;
drop policy "admin write" on public.events;
drop policy "own or admin read" on public.attendance;
drop policy "student marks self" on public.attendance;
drop policy "admin write" on public.attendance;
drop policy "own or admin read" on public.profiles;

-- sections
create policy "read" on public.sections for select to authenticated using (true);
create policy "admin all" on public.sections for all using (public.is_admin()) with check (public.is_admin());
create policy "coach update" on public.sections for update using (public.is_coach_of(id)) with check (public.is_coach_of(id));

-- section_coaches
create policy "own or admin read" on public.section_coaches for select using (user_id = auth.uid() or public.is_admin());
create policy "admin write" on public.section_coaches for all using (public.is_admin()) with check (public.is_admin());

-- section_members
create policy "read" on public.section_members for select
  using (user_id = auth.uid() or public.is_admin() or public.is_coach_of(section_id));
create policy "join self" on public.section_members for insert with check (user_id = auth.uid());
create policy "leave self" on public.section_members for delete using (user_id = auth.uid());
create policy "admin all" on public.section_members for all using (public.is_admin()) with check (public.is_admin());

-- events: читают все, правят админ и тренер секции
create policy "read" on public.events for select to authenticated using (true);
create policy "manage" on public.events for all
  using (public.is_admin() or public.is_coach_of(section_id))
  with check (public.is_admin() or public.is_coach_of(section_id));

-- attendance: студент видит/ставит только своё, тренер — по своей секции, админ — всё
create policy "read" on public.attendance for select using (
  user_id = auth.uid() or public.is_admin()
  or exists (select 1 from public.events e where e.id = event_id and public.is_coach_of(e.section_id)));
create policy "student marks self" on public.attendance for insert
  with check (user_id = auth.uid() and status = 'present');
create policy "manage" on public.attendance for all
  using (public.is_admin() or exists (select 1 from public.events e where e.id = event_id and public.is_coach_of(e.section_id)))
  with check (public.is_admin() or exists (select 1 from public.events e where e.id = event_id and public.is_coach_of(e.section_id)));

-- profiles: свой, админ — все, тренер — свои студенты
create policy "read" on public.profiles for select
  using (id = auth.uid() or public.is_admin() or public.coaches_student(id));
