# db-functions — DB 함수와 트리거

표기: [문서] 공식 문서에서 확인, [판단] 이 템플릿에 맞춘 조합, [실측] 이 템플릿의 DB 테스트로 확인.

## 언제 쓰는가

- 우회되면 안 되는 규칙(상태 전이, 열 단위 제한). 서버 액션의 검사는 API를 직접 부르면 우회된다.
- 여러 테이블을 전부 성공 아니면 전부 실패로 바꿔야 할 때.
- `updated_at`을 자동으로 고칠 때.

서버 액션으로 충분하면 쓰지 않는다. 로직이 DB에 있으면 읽기 어렵고 테스트가 늘어난다.

## 지킬 것

1. 기본은 `security invoker`다(부른 사용자의 권한으로 돈다) [문서].
2. 모든 함수에 `set search_path = ''`를 쓰고 본문의 이름에 스키마를 붙인다 [문서].
3. `public`의 함수는 API로 누구나 부를 수 있다. `security definer`가 꼭 필요하면 `private` 스키마에 만든다. 구조 검사가 `public`의 `security definer`를 막는다 [문서][실측].
4. 만든 뒤 실행 권한을 거둔다: `revoke execute on function … from anon, public;`. 필요한 역할에만 준다. `public`에서 거두지 않으면 `anon`에서 거둬도 소용없다 [문서].
5. 트리거 함수는 `private` 스키마에 둔다. API로 부를 일이 없다.
6. 함수마다 DB 테스트를 쓴다. 허용되는 경우와 막히는 경우 [판단].
7. 어느 규칙을 트리거가 강제하는지 `docs/rules.md`의 그 규칙 옆에 "강제: DB 트리거"라고 적는다.

```sql
create schema if not exists private;

-- 상태 전이를 강제한다. docs/rules.md 의 상태 흐름표와 같아야 한다.
create function private.guard_request_status() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.status = new.status then return new; end if;
  if (old.status, new.status) not in (
    ('submitted', 'approved'), ('submitted', 'rejected'), ('approved', 'purchased'), ('purchased', 'delivered')
  ) then
    raise exception '상태를 % 에서 % 로 바꿀 수 없다', old.status, new.status using errcode = 'P0001';
  end if;
  return new;
end;
$$;
comment on function private.guard_request_status() is '상태가 허용한 순서로만 바뀌게 막는다. 트리거 requests_status_guard 가 부른다';
revoke execute on function private.guard_request_status() from anon, authenticated, public;

create trigger requests_status_guard before update of status on public.requests
  for each row execute function private.guard_request_status();
```

`updated_at` 자동 갱신은 `moddatetime` 확장을 쓴다 [문서: PostgreSQL].

```sql
create extension if not exists moddatetime with schema extensions;
create trigger requests_set_updated_at before update on public.requests
  for each row execute function extensions.moddatetime(updated_at);
```

DB 테스트에서 켤 수 있는 확장은 `btree_gin`, `citext`, `moddatetime`, `pg_trgm`, `pgcrypto`, `unaccent`, `uuid_ossp`다 [실측]. 이 밖의 확장을 켜는 마이그레이션은 DB 테스트에서 적용에 실패한다. 그때는 `test/db/support/`를 고치지 말고 사용자에게 알린다.

위 두 예시는 `../examples/extensions.sql`과 `extensions.rls.test.ts`에서 확인한 것이다 [실측].

## 하지 않는 것

- `security definer`에 `search_path`를 빼기.
- 업무 규칙을 트리거와 서버 액션 양쪽에 다르게 쓰기. 원본은 `docs/rules.md` 하나다.
- 트리거 안에서 외부를 부르기(HTTP, 메일).
- 뷰를 `security_invoker = true` 없이 만들기 [문서].

## 확인 방법

- `pnpm test` 통과(구조 검사와 함수 테스트).
- 사용자가 실행: `pnpm supabase db advisors --linked --project-ref 《개발 Project ID》 --type security`. `function_search_path_mutable`(0011), `anon_security_definer_function_executable`(0028), `authenticated_security_definer_function_executable`(0029)가 없다.
- 브라우저에서 금지된 상태 변경을 시도하면 오류가 나고 허용된 변경은 된다.

## 출처

- https://supabase.com/docs/guides/database/functions
- https://supabase.com/docs/guides/database/postgres/triggers
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/api/securing-your-api
- https://supabase.com/docs/guides/database/database-advisors
- https://www.postgresql.org/docs/current/contrib-spi.html
