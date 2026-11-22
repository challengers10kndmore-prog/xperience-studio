-- Row level security: public reads published rows, admins write, anyone may insert contact_messages and page_views.
alter table public.admins enable row level security;
alter table public.brands enable row level security;
alter table public.projects enable row level security;
alter table public.site_settings enable row level security;
alter table public.section_media enable row level security;
alter table public.testimonials enable row level security;
alter table public.services enable row level security;
alter table public.faqs enable row level security;
alter table public.before_after enable row level security;
alter table public.contact_messages enable row level security;
alter table public.page_views enable row level security;

-- admins: a signed-in user can see their own row; admins see all. Writes only via service role / SQL.
create policy admins_self_read on public.admins for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- published content tables
do $$
declare t text;
begin
  foreach t in array array['brands','projects','section_media','testimonials','services','faqs','before_after'] loop
    execute format('create policy %I_public_read on public.%I for select to anon, authenticated using (published = true or public.is_admin())', t, t);
    execute format('create policy %I_admin_insert on public.%I for insert to authenticated with check (public.is_admin())', t, t);
    execute format('create policy %I_admin_update on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t, t);
    execute format('create policy %I_admin_delete on public.%I for delete to authenticated using (public.is_admin())', t, t);
  end loop;
end $$;

-- site settings: always readable, admin writes
create policy site_settings_public_read on public.site_settings for select to anon, authenticated using (true);
create policy site_settings_admin_update on public.site_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy site_settings_admin_insert on public.site_settings for insert to authenticated with check (public.is_admin());

-- contact messages: anyone inserts, admins read/update/delete
create policy contact_insert on public.contact_messages for insert to anon, authenticated with check (true);
create policy contact_admin_read on public.contact_messages for select to authenticated using (public.is_admin());
create policy contact_admin_update on public.contact_messages for update to authenticated using (public.is_admin());
create policy contact_admin_delete on public.contact_messages for delete to authenticated using (public.is_admin());

-- page views: anyone inserts, admins read
create policy page_views_insert on public.page_views for insert to anon, authenticated with check (true);
create policy page_views_admin_read on public.page_views for select to authenticated using (public.is_admin());

-- table grants (Supabase defaults grant these, kept explicit)
grant select on all tables in schema public to anon, authenticated;
grant insert on public.contact_messages, public.page_views to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
revoke select on public.contact_messages, public.page_views from anon;

-- ---------- storage: private "inbox" bucket ----------
insert into storage.buckets (id, name, public, file_size_limit)
values ('inbox', 'inbox', false, 524288000)
on conflict (id) do update set public = false;

create policy inbox_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'inbox' and public.is_admin());
create policy inbox_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'inbox' and public.is_admin());
create policy inbox_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'inbox' and public.is_admin());
create policy inbox_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'inbox' and public.is_admin());

-- ---------- admin helper functions ----------
create or replace function public.inbox_usage() returns table (bytes bigint, files bigint)
language plpgsql stable security definer set search_path = public, storage as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
    select coalesce(sum((metadata->>'size')::bigint), 0)::bigint, count(*)::bigint
    from storage.objects where bucket_id = 'inbox';
end $$;
revoke all on function public.inbox_usage() from public, anon;
grant execute on function public.inbox_usage() to authenticated;

create or replace function public.page_view_stats(days int default 30)
returns table (day date, path text, views bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
    select (pv.created_at at time zone 'utc')::date, pv.path, count(*)::bigint
    from public.page_views pv
    where pv.created_at > now() - make_interval(days => greatest(1, least(days, 365)))
    group by 1, 2 order by 1 desc, 3 desc;
end $$;
revoke all on function public.page_view_stats(int) from public, anon;
grant execute on function public.page_view_stats(int) to authenticated;

-- keep-alive ping target: a tiny public read
create or replace function public.ping() returns timestamptz language sql stable as $$ select now() $$;
grant execute on function public.ping() to anon, authenticated;
