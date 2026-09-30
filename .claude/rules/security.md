---
paths:
  - "app/**/actions.ts"
  - "app/**/route.ts"
  - "app/(auth)/**"
  - "app/auth/**"
  - "features/**/actions.ts"
  - "lib/auth.ts"
  - "lib/safe-redirect.ts"
  - "lib/request-origin.ts"
  - "lib/search.ts"
  - "lib/supabase/**"
  - "proxy.ts"
  - "next.config.*"
  - "pnpm-workspace.yaml"
  - "package.json"
  - "supabase/config.toml"
  - "supabase/migrations/**"
  - "docs/schema.md"
---

# 보안 규칙 (OWASP Top 10:2025 기준)

보안 문제는 기능보다 먼저 고친다. 계획을 세울 때와 끝내기 전에 아래 표를 대조한다.

이 구조에서는 **인증을 Supabase가 하고 인가를 DB가 한다.** 그래서 직접 짜는 코드는 적다. 대신 **설정이 곧 보안**이다. 설정은 코드에 없어 검사가 잡지 못한다. 사람이 `docs/security-checklist.md`로 확인한다.

표기: [문서] 공식 문서에서 확인, [실측] 이 템플릿에서 실행해 확인, [판단] 이 템플릿의 결정.

| 순위 | 취약점 | 이 프로젝트의 방어 | 어디서 |
|---|---|---|---|
| A01 | Broken Access Control | 권한(grant) + RLS + 권한 코드, 서버 액션의 재확인, 이동 대상 확인 | `database.md`, §2, §3 |
| A02 | Security Misconfiguration | 가입 차단, 보안 헤더, 개발·운영·미리 보기 분리 | §1, §4, §5 |
| A03 | Software Supply Chain Failures | 설치 승인, 게시 대기 시간, 신뢰 수준 검사, 감사 | §7 |
| A04 | Cryptographic Failures | 비밀번호·토큰은 Supabase Auth, 고유식별정보는 저장하지 않음 | §1, §6 |
| A05 | Injection | 값을 인자로 받는 필터, 검색어 이스케이프, HTML 직접 삽입 금지 | §3 |
| A06 | Insecure Design | 우회되면 안 되는 규칙은 DB에서 강제 | `database.md` §8 |
| A07 | Authentication Failures | 시도 제한·비밀번호 정책(설정), 실패 문구 통일 | §1, §2 |
| A08 | Software or Data Integrity Failures | 토큰 검증(`getClaims()`), 적용한 마이그레이션 보호 | `data-access.md` §2 |
| A09 | Security Logging and Alerting Failures | 역할 변경 이력, 접속 기록, 로그의 개인정보 | §6 |
| A10 | Mishandling of Exceptional Conditions | 읽지 못하면 권한 없음으로 처리, 오류의 내부 정보 비노출 | §3, `data-access.md` §6 |

## 1. 인증 설정 (사람이 대시보드에서 한다)

AI는 대시보드를 바꾸지 못한다. 아래가 필요한 작업이면 **계획과 보고에 "사람이 할 설정"으로 적는다.**

- **가입을 막는다.** Supabase는 기본으로 누구나 가입할 수 있다 [문서]. 가입한 사람은 `authenticated` 역할을 받아 "로그인한 모든 사용자"에게 연 표를 읽는다. 사용자는 관리자가 초대한다.
- 가입 화면과 가입 액션(`signUp()`)을 만들지 않는다. 메일 링크 로그인(`signInWithOtp`)을 쓰면 `shouldCreateUser: false`를 준다. 기본값은 사용자를 자동으로 만든다 [문서].
- 익명 로그인을 켜지 않는다. 켜면 익명 사용자도 `authenticated` 역할이다 [문서].
- 비밀번호 최소 길이·문자 종류, 유출된 비밀번호 차단(Pro 이상), 이메일 확인, 시도 제한은 대시보드 설정이다 [문서]. 코드로 다시 만들지 않는다.
- 토큰 만료는 기본값(1시간) 이하로 둔다 [문서]. **역할을 거두거나 계정을 지워도 이미 발급된 토큰은 만료까지 쓸 수 있다** [문서]. 바로 막아야 하는 동작은 DB에서 `user_roles`를 다시 확인하는 정책으로 막는다.
- Redirect URLs에는 정확한 주소를 넣는다. 넓은 와일드카드는 미리 보기 배포용으로만 쓴다 [문서].
- 인터넷으로 접속하는 도구가 개인정보를 다루면 추가 인증(MFA)을 검토한다. 정책에서 요구하려면 `as restrictive` 정책으로 `(select auth.jwt()->>'aal') = 'aal2'`를 쓴다 [문서].

## 2. 로그인 흐름의 코드

참조 구현: `app/(auth)/login/`, `app/(auth)/set-password/`, `app/auth/confirm/route.ts`.

- 로그인 실패 문구는 **하나**다("이메일 또는 비밀번호가 맞지 않습니다."). 계정이 있는지, 무엇이 틀렸는지 알려 주지 않는다.
- 초대·재설정 메일의 링크는 `/auth/confirm`이 받아 `verifyOtp()`로 확인한다 [문서].
- **Supabase 공식 예제의 `/auth/confirm`은 `next`를 확인하지 않고 `redirect(next)` 한다.** `redirect()`는 다른 사이트의 주소도 받는다 [문서]. 그대로 복사하지 않는다. 참조 구현을 쓴다.
- 밖에서 온 값(`?next=`, 폼의 숨은 값)으로 화면을 옮길 때는 `lib/safe-redirect.ts`의 `safeRedirectPath()`를 거친다. `/`로 시작하는지만 보면 `//evil.example`을 놓친다 [실측].
- 로그인 없이 열 수 있는 경로는 `lib/supabase/proxy.ts`의 `PUBLIC_PATHS`에만 더한다. 더할 때마다 사용자에게 알린다.
- 비밀번호, 토큰, 메일의 `token_hash`를 로그·오류 문구·주소의 다른 쿼리에 넣지 않는다.

## 3. 입력과 출력

- 모든 입력은 Zod로 검증한다(`schema.ts`). 폼, 주소의 쿼리, 경로의 `[id]` 모두.
- **필터 문자열에 값을 끼워 넣지 않는다.** `.or()`, `.filter()`, `.not()`의 문자열은 그대로 쓰인다 [문서]. 쉼표·괄호가 든 입력으로 조건을 바꿀 수 있다. 값을 인자로 받는 `.eq()`, `.in()`, `.ilike()`를 쓴다.
- 검색어는 `lib/search.ts`의 `toContainsPattern()`으로 바꿔 `.ilike(열, 패턴)`에 넘긴다. `%`, `_`, `*`를 글자 그대로 찾게 하고 길이를 자른다. `` `%${검색어}%` ``처럼 직접 만든 패턴은 `pnpm check:app`이 막는다.
- 정렬·선택하는 **열 이름**을 입력에서 받지 않는다. `.order()`와 `.select()`는 받은 글자를 그대로 쓴다 [문서: supabase-js 소스]. 허용 목록에서 고른다: `const SORT = { newest: "created_at", name: "full_name" } as const`.
- `dangerouslySetInnerHTML`을 쓰지 않는다. 글은 `{value}`로 넣는다. HTML을 보여 줘야 하면 계획에서 정제 방법을 승인받는다.
- 서버가 입력받은 주소를 호출하는 기능(주소 미리 보기, 웹훅 등록)은 만들기 전에 계획에서 승인받는다. 내부 주소를 부르게 만드는 공격(SSRF)의 통로다.
- 사용자에게 돌려주는 문구에 DB의 오류 메시지를 넣지 않는다. 던진 오류는 Next.js가 운영에서 가리지만 **서버 액션이 돌려준 값은 그대로 나간다** [문서].
- 권한을 읽지 못하면 권한이 없는 것으로 처리한다(`lib/auth.ts`). 확인에 실패했을 때 통과시키지 않는다.

## 4. 브라우저 경계

- 상태를 바꾸는 요청은 **서버 액션**으로 받는다. Next.js가 출처(Origin과 Host)를 비교한다 [문서]. 이 보호는 로그인·권한 확인을 대신하지 않는다.
- `route.ts`에는 그 보호가 없다 [문서]. 화면이 부르는 `POST·PUT·PATCH·DELETE`는 첫 줄에서 `lib/request-origin.ts`의 `isSameOrigin(request)`를 확인한다. 외부 서비스가 부르는 주소는 서명이나 비밀 값을 확인한다.
- `GET`으로 상태를 바꾸지 않는다. 링크를 미리 읽는 프로그램(메일, 메신저)이 실행한다.
- 보안 헤더는 `next.config.ts`의 `headers()`에 있다. 지우거나 느슨하게 바꾸지 않는다. 다른 사이트의 화면을 틀에 넣어야 하면(`frame-ancestors`) 계획에서 승인받는다.
- 클라이언트 컴포넌트에 넘기는 값은 브라우저에 그대로 나간다. 내부용 열, 다른 사용자의 개인정보를 넘기지 않는다.
- `NEXT_PUBLIC_`으로 시작하는 변수는 빌드할 때 브라우저용 코드에 박힌다 [문서]. 주소와 publishable 키 둘만 쓴다.

## 5. 비밀 값과 환경

- 비밀 값을 코드·문서·테스트·커밋·로그·AI와의 대화에 넣지 않는다. 훅이 막는다. 막혔으면 그 키는 노출된 것이다. 사용자에게 새로 발급하라고 알린다.
- 개발·운영은 서로 다른 Supabase 프로젝트다. **미리 보기 배포(Preview)는 운영 DB를 보지 않는다** [판단].
- 환경 변수를 더할 때는 `.env.example`에 이름만 적는다. 값은 사용자가 `.env.local`과 Vercel에 넣는다.
- secret 키는 `admin-api` 확장을 켠 뒤 `lib/supabase/admin.ts`에서만 읽는다(`recipes/admin-api.md`).
- Supabase MCP는 개발 프로젝트에 읽기 전용으로만 연결한다.

## 6. 개인정보와 기록

법률 자문이 아니다. 개인정보를 다루는 기능은 계획에서 사용자에게 확인을 요청한다.

- 새 테이블에 이름·연락처·주소 등 개인정보가 들어가면 `docs/schema.md`의 그 열에 "개인정보"라고 적는다.
- **주민등록번호, 여권번호, 운전면허번호, 외국인등록번호, 계좌번호, 카드번호, 생체인식정보를 저장하는 열을 만들지 않는다.** 암호화해 저장해야 하는 정보다(개인정보의 안전성 확보조치 기준 제7조) [문서]. 필요하면 멈추고 사용자에게 알린다: 꼭 필요한지, 뒤 몇 자리나 확인 여부(`is_verified`)만으로 되는지 묻는다. 열 이름으로 `pnpm check:migrations`가 막는다. 사용자가 저장 방법(암호화, 읽는 사람, 보관 기간)을 정한 뒤에만 파일 첫 줄에 `-- sensitive-ok: 《사유》`를 적는다. 스스로 적지 않는다.
- 연락처·주소·생년월일 같은 개인정보 열을 더할 때는 **그 테이블의 select 정책을 먼저 읽는다.** `profiles`는 모든 로그인 사용자가 읽는다(`using (true)`). 모두가 볼 필요가 없는 정보는 본인과 권한(`authorize()`)으로 읽는 별도 테이블에 둔다. 정책은 행 단위라 열 하나만 가릴 수 없다.
- 역할 변경 이력은 `user_role_events`에 트리거가 남긴다 [실측]. 권한의 부여·변경·말소 기록은 3년 이상 보관한다(같은 기준 제5조) [문서]. 이 테이블을 고치거나 지우는 기능을 만들지 않는다.
- 접속 기록(누가 언제 누구의 개인정보를 처리했는가)은 1년 이상 보관한다. 고유식별정보·민감정보를 다루면 2년 이상이다(같은 기준 제8조) [문서]. Supabase의 기본 로그는 며칠에서 몇 주만 남는다 [문서]. 개인정보를 다루는 화면을 만들 때 기록 방법을 계획에 넣는다: 이력 테이블(변경은 트리거로), 외부 로그 보관.
- 이력 테이블은 `request_events`·`user_role_events`처럼 읽기 권한만 주고 쓰기는 트리거나 DB 함수가 한다. 화면 코드가 쓰는 이력은 API를 직접 부르면 빠진다.
- 로그에 남기지 않는 것: 비밀번호, 토큰, 쿠키, 이메일, 전화번호, 위의 식별 번호. 오류는 `{ code: error.code }`만 남긴다.
- 목록과 내려받기에는 업무에 필요한 개인정보만 넣는다.

## 7. 의존성과 공급망

- 새 패키지는 승인 뒤에 사용자가 설치한다. 제안할 때 용도, 대안, 유지 상태, 최근 릴리스 시점을 적는다.
- **처음 보는 이름의 패키지는 제안하기 전에 실제로 있는지 확인한다**(공식 문서, 저장소). AI가 자주 지어내는 이름을 공격자가 먼저 등록해 둔다 [문서: OWASP LLM09].
- `pnpm-workspace.yaml`의 `minimumReleaseAge`, `trustPolicy`, `trustPolicyIgnoreAfter`, `blockExoticSubdeps`, `strictDepBuilds`, `allowBuilds`를 느슨하게 바꾸지 않는다. 설치가 막히면 이유를 보고한다.
- 설치 스크립트를 실행해야 하는 패키지는 사용자가 `allowBuilds`에 `true`로 더한다. `pnpm approve-builds`를 실행하지 않는다.
- 승인되지 않은 패키지를 `pnpm dlx`·`npx`로 실행하지 않는다. 훅이 `shadcn` 말고는 막는다. 이름이 한 글자만 달라도 다른 패키지다(`shadcn-ui`는 폐기된 옛 이름이다 [실측]). 설치된 도구는 `pnpm exec 《도구》`로 실행한다.
- `pnpm check:deps`(알려진 취약점과 서명 확인)는 PR을 준비할 때와 CI에서 돌린다. high 이상이 나오면 보고하고 갱신 계획을 낸다.
- 레지스트리의 판이 낡은 패키지는 공식 배포처를 따른다(예: SheetJS, `recipes/excel.md`).

## 8. 검사가 보는 것과 보지 못하는 것

| 규칙 | 검사 |
|---|---|
| 필터 문자열에 값을 끼워 넣음, `dangerouslySetInnerHTML`, 확인하지 않은 값으로 이동 | `pnpm check:app` |
| `route.ts`의 출처 확인, 서버 액션의 로그인 확인·입력 검증 | `pnpm check:app` |
| 비밀 값, secret 키의 위치 | 훅, ESLint, `pnpm check:extensions` |
| RLS·권한·정책·함수 | DB 테스트의 구조 검사 |
| 알려진 취약점, 패키지 서명 | `pnpm check:deps` |
| **가입 차단, 비밀번호 정책, Redirect URLs, 환경 변수의 분리** | **없다.** 사람이 `docs/security-checklist.md`로 확인한다 |
| **열 이름을 입력에서 받음, 클라이언트로 넘어간 내부 값, 접속 기록** | **없다.** `security-reviewer`와 사람이 본다 |
