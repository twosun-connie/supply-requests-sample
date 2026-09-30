-- 사용자가 생기면(초대 수락, 관리자 API 생성) 프로필 행을 만든다.
-- 이것이 없으면 초대한 사용자가 사용자 관리 화면에 나타나지 않는다(실제 Supabase 검증에서 발견).
-- 이름은 초대할 때 넣은 user_metadata.full_name, 없으면 이메일의 @ 앞부분, 그것도 없으면 "사용자"다. 사용자가 나중에 고친다.
-- auth.users 를 읽고 public.profiles 에 쓰므로 만든 사람의 권한으로 도는 함수(security definer)로 둔다. 노출되지 않는 private 스키마에 둔다.
create function private.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), '사용자'), 50)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke execute on function private.create_profile_for_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.create_profile_for_new_user();

-- 이미 있는 사용자의 프로필을 채운다.
insert into public.profiles (id, full_name)
select id, left(coalesce(nullif(trim(raw_user_meta_data ->> 'full_name'), ''), nullif(split_part(coalesce(email, ''), '@', 1), ''), '사용자'), 50)
from auth.users
on conflict (id) do nothing;
