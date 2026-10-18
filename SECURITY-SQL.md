# Tichi security hardening — run in Supabase Dashboard → SQL Editor

## Phase 1 (run now; safe, nothing breaks)

```sql
-- Login without ever sending password hashes to the client.
create or replace function public.get_login_salt(p_username text)
returns text language sql security definer set search_path = public stable as $$
  select split_part(password_hash, ':', 1) from public.profiles
  where lower(username) = lower(p_username) and password_hash is not null limit 1
$$;

create or replace function public.login_with_hash(p_username text, p_hash text)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'profile',  to_jsonb(p) - 'password_hash',
    'progress', coalesce((select jsonb_agg(to_jsonb(np)) from public.node_progress np where np.user_id = p.id), '[]'::jsonb)
  )
  from public.profiles p
  where lower(p.username) = lower(p_username) and p.password_hash = p_hash
  limit 1
$$;

revoke all on function public.get_login_salt(text), public.login_with_hash(text, text) from public;
grant execute on function public.get_login_salt(text), public.login_with_hash(text, text) to anon, authenticated;

-- Friends list cards (adds streak + score). Public-safe columns only.
create or replace function public.get_public_profiles(p_ids uuid[])
returns table(id uuid, name text, username text, avatar_url text, diamonds int, streak_days int, total_score int)
language sql security definer set search_path = public stable as $$
  select p.id, p.name, p.username, p.avatar_url, p.diamonds::int, p.streak_days::int, p.total_score::int
  from public.profiles p where p.id = any(p_ids)
$$;
revoke all on function public.get_public_profiles(uuid[]) from public;
grant execute on function public.get_public_profiles(uuid[]) to anon, authenticated;

-- Friends: let everyone read friendships (for "friends of friends").
drop policy if exists "friendships read all" on public.friendships;
create policy "friendships read all" on public.friendships for select using (true);
```

## Phase 2 (run AFTER the new app version is live and you logged in once with it)

```sql
-- Stop leaking password hashes / birth dates / progress by id or username.
drop function if exists public.get_login_profile_full(uuid);
drop function if exists public.get_node_progress_by_user(uuid);
drop function if exists public.get_login_profile(text);
create function public.get_login_profile(p_username text)
returns table(id uuid, password_hash text) language sql security definer set search_path = public stable as $$
  select p.id, null::text from public.profiles p where lower(p.username) = lower(p_username) limit 1
$$;
revoke all on function public.get_login_profile(text) from public;
grant execute on function public.get_login_profile(text) to anon, authenticated;
```

## Not fixed (needs your decision)
- `questions` table is writable with the public key: anyone can rewrite the curriculum. Making it
  read-only breaks the admin pages (question-editor, recorders) until they get a real admin login.
- Passwords are salted SHA-256 (fast hash). With hashes no longer exposed this is acceptable; no rate limit on login attempts.

## Phase 3 (fixes: avatar/diamonds/streak/progress not saving + "add friend failed 23503" after login on another device)

Writes used to depend on the browser's anonymous `auth.uid()`, which is different from the account's
profile id after a login on a new browser/device. These functions authenticate with the account's own
password hash instead (the same proof as login) and can only touch that account's rows.

```sql
create or replace function public._resolve_profile(p_me uuid, p_hash text)
returns uuid language sql security definer set search_path = public stable as $$
  select id from public.profiles
  where (id = p_me or local_id::text = p_me::text)
    and password_hash is not null and password_hash = p_hash
  limit 1
$$;
revoke all on function public._resolve_profile(uuid, text) from public, anon, authenticated;

-- Update the caller's own profile (only the keys present in p_patch are changed).
create or replace function public.update_my_profile(p_me uuid, p_hash text, p_patch jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare pid uuid; r public.profiles;
begin
  pid := public._resolve_profile(p_me, p_hash);
  if pid is null then return false; end if;
  r := jsonb_populate_record(null::public.profiles, p_patch);
  update public.profiles p set
    name             = case when p_patch ? 'name'             then r.name             else p.name end,
    avatar_url       = case when p_patch ? 'avatar_url'       then r.avatar_url       else p.avatar_url end,
    diamonds         = case when p_patch ? 'diamonds'         then r.diamonds         else p.diamonds end,
    streak_days      = case when p_patch ? 'streak_days'      then r.streak_days      else p.streak_days end,
    last_active_date = case when p_patch ? 'last_active_date' then r.last_active_date else p.last_active_date end,
    total_score      = case when p_patch ? 'total_score'      then r.total_score      else p.total_score end
  where p.id = pid;
  return true;
end $$;

create or replace function public.add_friend_secure(p_me uuid, p_hash text, p_friend uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  pid := public._resolve_profile(p_me, p_hash);
  if pid is null or p_friend = pid then return false; end if;
  insert into public.friendships (user_id, friend_id) values (pid, p_friend)
  on conflict (user_id, friend_id) do nothing;
  return true;
end $$;

create or replace function public.get_my_friend_ids(p_me uuid, p_hash text)
returns uuid[] language sql security definer set search_path = public stable as $$
  select coalesce(array_agg(f.friend_id), '{}') from public.friendships f
  where f.user_id = public._resolve_profile(p_me, p_hash)
$$;

create or replace function public.save_my_progress(p_me uuid, p_hash text, p_row jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  pid := public._resolve_profile(p_me, p_hash);
  if pid is null then return false; end if;
  insert into public.node_progress (user_id, node_id, stars, completed, best_accuracy, attempts, last_played_at)
  values (pid, p_row->>'node_id', (p_row->>'stars')::int, (p_row->>'completed')::boolean,
          (p_row->>'best_accuracy')::numeric, (p_row->>'attempts')::int, (p_row->>'last_played_at')::timestamptz)
  on conflict (user_id, node_id) do update set
    stars = excluded.stars, completed = excluded.completed, best_accuracy = excluded.best_accuracy,
    attempts = excluded.attempts, last_played_at = excluded.last_played_at;
  return true;
end $$;

grant execute on function public.update_my_profile(uuid, text, jsonb),
  public.add_friend_secure(uuid, text, uuid),
  public.get_my_friend_ids(uuid, text),
  public.save_my_progress(uuid, text, jsonb) to anon, authenticated;
```
