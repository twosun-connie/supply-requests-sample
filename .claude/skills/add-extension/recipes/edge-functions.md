# edge-functions — Supabase Edge Functions

표기: [문서] 공식 문서에서 확인, [판단] 이 템플릿에 맞춘 조합, [확인 필요] 쓰기 전에 공식 문서로 확인.

## 먼저 묻는다: Route Handler로 되는가

이 프로젝트에는 이미 Next.js 서버가 있다. 외부 서비스의 웹훅을 받거나 브라우저가 부르는 주소는 `app/api/…/route.ts`로 충분하다. 같은 저장소, 같은 검증(`pnpm verify`), 같은 배포를 쓴다.

Edge Function이 맞는 경우 [판단]
- 부르는 쪽이 DB다(`pg_cron`, `pg_net`).
- secret 키를 Vercel에 두지 않으려 한다.

알아 둘 것 [문서]: Deno 런타임이다(Node 패키지가 다 되지는 않는다). 메모리·CPU·실행 시간 한도가 있다. `pnpm verify`의 타입 검사와 린트가 `supabase/functions/`를 보지 않는다 [판단].

## 필요한 것

- 만들기: `pnpm supabase functions new 《이름》`.
- 비밀 값: 사용자가 `pnpm supabase secrets set 《이름》=《값》`. 이름은 `SUPABASE_`로 시작할 수 없다 [문서].
- 배포: 사용자가 `pnpm supabase functions deploy 《이름》 --project-ref 《Project ID》` [확인 필요: 옵션].
- 설정: `supabase/config.toml`의 `[functions.《이름》] verify_jwt` [문서].

## 지킬 것

1. `verify_jwt`는 켜 둔다(기본값). 로그인한 사용자만 부르는 함수는 그대로 둔다 [문서].
2. 외부 웹훅을 받는 함수만 `verify_jwt = false`로 하고, 함수 안에서 **보낸 쪽의 서명을 검증한다** [문서].
3. 키는 `apikey` 헤더로, 사용자 토큰은 `Authorization` 헤더로 보낸다. secret 키를 `Authorization: Bearer`로 보내지 않는다 [문서].
4. 기본은 사용자의 권한으로 DB를 읽는다(정책이 적용된다). 정책을 우회하는 클라이언트는 필요한 곳에만 쓴다 [문서].
5. 짧게, 두 번 실행돼도 안전하게 만든다 [문서].
6. 응답과 로그에 비밀 값을 넣지 않는다.
7. `supabase/functions/.env`는 커밋하지 않는다.

함수 안에서 쓰는 SDK와 환경 변수의 이름은 공식 문서에서 확인한다 [확인 필요]. 옛 이름(`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`)은 쓰지 않는다.

## 하지 않는 것

- `verify_jwt = false`로 두고 서명 검증 없이 받기.
- 같은 로직을 Route Handler와 Edge Function 양쪽에 두기.
- 오래 걸리는 일을 요청 하나 안에서 끝까지 하기.

## 확인 방법

- 대시보드 Edge Functions에 함수와 호출 기록이 보인다.
- 토큰 없이 부르면 401이다(`verify_jwt`를 켠 함수).
- 서명이 틀린 웹훅은 거부된다.
- 비밀 값이 대시보드의 Secrets에 있고 저장소에는 없다.

## 출처

- https://supabase.com/docs/guides/functions
- https://supabase.com/docs/guides/functions/auth
- https://supabase.com/docs/guides/functions/function-configuration
- https://supabase.com/docs/guides/functions/secrets
- https://supabase.com/docs/guides/functions/limits
