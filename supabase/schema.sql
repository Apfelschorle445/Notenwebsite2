-- GradeFlow initial schema. Run in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.school_years (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, starts_on date, ends_on date, is_archived boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  school_year_id uuid references public.school_years(id) on delete set null, name text not null,
  color text not null default '#6478e8', weight numeric(10,3) not null default 1 check (weight > 0),
  grading_system jsonb not null default '{"direction":"lower_is_better","scale":[{"grade":1,"score":100},{"grade":2,"score":80},{"grade":3,"score":60},{"grade":4,"score":40},{"grade":5,"score":20},{"grade":6,"score":0}]}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.grade_categories (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade, name text not null,
  weight numeric(10,3) not null default 1 check (weight > 0), created_at timestamptz not null default now()
);
create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  category_id uuid not null references public.grade_categories(id) on delete cascade,
  value numeric(10,3) not null, weight numeric(10,3) not null default 1 check (weight > 0),
  graded_at date not null default current_date, comment text, created_at timestamptz not null default now()
);

alter table public.school_years enable row level security;
alter table public.subjects enable row level security;
alter table public.grade_categories enable row level security;
alter table public.grades enable row level security;

drop policy if exists "Users manage own school years" on public.school_years;
create policy "Users manage own school years" on public.school_years for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage own subjects" on public.subjects;
create policy "Users manage own subjects" on public.subjects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage own categories" on public.grade_categories;
create policy "Users manage own categories" on public.grade_categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id and exists (select 1 from public.subjects s where s.id = subject_id and s.user_id = auth.uid()));
drop policy if exists "Users manage own grades" on public.grades;
create policy "Users manage own grades" on public.grades for all using (auth.uid() = user_id) with check (auth.uid() = user_id and exists (select 1 from public.subjects s where s.id = subject_id and s.user_id = auth.uid()) and exists (select 1 from public.grade_categories c where c.id = category_id and c.subject_id = subject_id and c.user_id = auth.uid()));
