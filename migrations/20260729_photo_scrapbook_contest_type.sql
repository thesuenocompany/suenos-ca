-- Dedicated contest type for photo-story / scrapbook pages.
alter table public.contests
  add column if not exists contest_type text not null default 'standard';

alter table public.contests
  drop constraint if exists contests_contest_type_check;

alter table public.contests
  add constraint contests_contest_type_check
  check (contest_type in ('standard','photo_scrapbook'));

update public.contests
set contest_type='photo_scrapbook'
where layout_style='sunfest_scrapbook'
  and contest_type='standard';
