# multi-org — 여러 조직

표기: [문서] 공식 문서에서 확인, [판단] 이 템플릿에 맞춘 조합, [실측] 이 템플릿의 DB 테스트로 확인.

## 무엇이 달라지는가

한 조직의 데이터가 다른 조직에 보이면 사고다. 모든 업무 테이블의 모든 정책에 "내 조직인가"가 들어간다. 나중에 넣기는 어렵다. 조직이 둘이 될 것이 보이면 처음부터 넣는다.

## 필요한 것

- 마이그레이션: `organizations`, `org_members`, 업무 테이블의 `org_id` 열과 인덱스, `private` 스키마의 도우미 함수.
- `db-functions` 확장도 함께 켠다(도우미 함수가 있다).

## 지킬 것

1. 소속은 테이블로 관리한다: `org_members (org_id, user_id, primary key (org_id, user_id))`. `user_id`에 인덱스를 따로 만든다(복합 키는 첫 열만 인덱스로 쓰인다) [문서].
2. 모든 업무 테이블에 `org_id uuid not null`과 인덱스를 둔다 [문서].
3. 정책끼리 서로의 테이블을 읽으면 무한 재귀 오류가 난다. 소속을 읽는 **도우미 함수**로 끊는다. 도우미 함수는 `private` 스키마, `security definer`, `set search_path = ''`, `stable` [문서].
4. 정책은 `org_id in (select private.user_org_ids())` 모양으로 쓴다. 조인을 쓰지 않는다 [문서].
5. `update`에는 `using`과 `with check`를 둘 다 쓴다. 행을 남의 조직으로 옮기지 못하게 한다 [실측].
6. `insert`의 `with check`에 조직 조건을 넣는다. 브라우저가 보낸 `org_id`를 믿지 않는다.
7. 조회에도 `.eq("org_id", orgId)`를 붙인다. 인덱스를 타고, 정책이 빠졌을 때의 두 번째 방어선이다 [문서].
8. 지금 보고 있는 조직은 주소(`/o/《조직》/…`)에 둔다. 서버에서 소속을 다시 확인한다. 쿠키나 브라우저 저장소에만 두지 않는다 [판단].
9. 테이블마다 DB 테스트를 쓴다: 다른 조직의 행이 보이지 않는다, 다른 조직에 만들 수 없다, 다른 조직으로 옮길 수 없다 [실측].

본보기 SQL과 테스트는 `../examples/extensions.sql`, `extensions.rls.test.ts`에 있다.

## 역할과 조직

시작 상태의 역할(`user_roles`, 토큰의 `user_role`)은 **도구 전체**에 하나다. 조직마다 역할이 달라야 하면(A 조직에서는 관리자, B 조직에서는 구성원) `org_members`에 `role` 열을 두고, 권한 확인 함수를 조직을 받는 모양으로 새로 만든다. 공식 문서에 이 둘을 함께 쓰는 예시는 없다. 설계를 사용자와 먼저 정한다 [판단].

## 토큰에 조직을 넣는 방식

소속을 토큰에 넣으면 정책이 소속 테이블을 읽지 않아 빠르다. 그러나 조직에서 빼도 토큰이 갱신될 때까지 권한이 남고, 쿠키 크기에 한도가 있다 [문서]. 느리다는 것을 잰 뒤에 검토한다.

## 하지 않는 것

- 도우미 함수를 `public`에 두기.
- `for all` 정책 하나로 끝내기.
- 조직 조건을 화면이나 서버 액션에만 두기.
- 조직이 없는 공용 테이블(코드표 등)을 만들면서 이유를 적지 않기. `docs/schema.md`에 "조직 공용"이라고 적는다.

## 확인 방법

- `pnpm test` 통과.
- A 조직 계정으로 B 조직의 주소를 직접 열면 데이터가 없다.
- 조직에서 뺀 사용자가 바로 접근하지 못한다.

## 출처

- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/postgres/row-level-security-performance
- https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook
