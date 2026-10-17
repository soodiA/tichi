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

-- Friends: let everyone read friendships (for "friends of friends").
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
