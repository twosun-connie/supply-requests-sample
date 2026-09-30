# 보안 설정 확인표

**사람이** Supabase와 Vercel의 대시보드에서 확인하는 항목이다. 코드와 검사로는 확인할 수 없다.
처음 만들 때, 운영 프로젝트를 만들 때, 분기마다 한 번 확인하고 날짜를 적는다.
규칙의 근거는 `.claude/rules/security.md`에 있다. 메뉴 이름은 바뀔 수 있다. 이름이 다르면 뜻이 같은 항목을 찾는다.

| 확인한 날 | 개발 프로젝트 | 운영 프로젝트 | 확인한 사람 |
|---|---|---|---|
| 《YYYY-MM-DD》 | 《했음 / 아직》 | 《했음 / 아직》 | 《이름》 |

## 1. 가입과 로그인 (Supabase › Authentication)

- [ ] **가입을 막았다.** "Allow new users to sign up"을 껐다. 켜 두면 주소를 아는 누구나 가입해 로그인한 사용자가 된다
- [ ] 익명 로그인(Anonymous sign-ins)이 꺼져 있다
- [ ] 쓰지 않는 로그인 방식(소셜 로그인, 전화번호)이 꺼져 있다
- [ ] 이메일 확인(Confirm email)이 켜져 있다
- [ ] 비밀번호: 최소 길이 10자 이상, 문자 종류 요구를 가장 강한 것으로 했다. `app/(auth)/set-password/schema.ts`의 값과 맞췄다
- [ ] 유출된 비밀번호 차단을 켰다(Pro 요금제 이상)
- [ ] Site URL이 운영 주소다. Redirect URLs에는 운영 주소(`https://《운영 주소》/**`)와 미리 보기용 패턴(`https://*-《슬러그》.vercel.app/**`, 슬러그는 Vercel 배포 주소의 끝부분. 예: 배포 주소가 `…-abc123-sasem-2k.vercel.app`이면 `sasem-2k`)만 있다. 미리 보기 패턴이 없으면 미리 보기 주소에서 로그인 뒤 이동이 막힌다. `supabase/config.toml`에 적고 `config push`로 넣을 수 있다
- [ ] 메일 템플릿(초대, 비밀번호 재설정)의 링크를 `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=《invite 또는 recovery》&next=/set-password`로 바꿨다
- [ ] 메일 발송을 직접 설정했다(Custom SMTP). 기본 발송은 팀 구성원에게만, 시간당 몇 통만 간다
- [ ] Custom Access Token 훅이 켜져 있고 `public.custom_access_token_hook`을 가리킨다
- [ ] 시도 제한(Rate Limits)을 기본값보다 느슨하게 바꾸지 않았다

## 2. 세션과 추가 인증

- [ ] 토큰 만료(JWT expiry)는 기본값(1시간) 이하다
- [ ] (Pro 이상) 세션 시간 제한과 비활성 제한을 정했다. 값: 《예: 12시간, 1시간》
- [ ] 개인정보를 다루면 추가 인증(MFA)을 검토했다. 결정: 《쓴다 / 안 쓴다, 이유》

## 3. 데이터베이스와 API (Supabase)

- [ ] 보안 점검에 경고가 없다: `pnpm supabase db advisors --linked --project-ref 《Project ID》 --type security`
- [ ] SSL 강제(Enforce SSL)를 켰다
- [ ] Data API에 노출하는 스키마는 `public`뿐이다. `private`는 넣지 않았다
- [ ] GraphQL을 쓰지 않으면 `pg_graphql` 확장을 껐다
- [ ] 개발 프로젝트와 운영 프로젝트가 다르다. `supabase/project-refs.json`에 둘 다 적었다
- [ ] Supabase 계정에 추가 인증을 켰다. 조직의 소유자가 두 명 이상이다

## 4. 배포 (Vercel)

- [ ] 운영(Production)과 미리 보기(Preview)의 환경 변수가 다르다. **미리 보기에는 운영 프로젝트의 주소와 키를 넣지 않았다.** 운영 주소의 `/health`에 운영 프로젝트가, 미리 보기 주소의 `/health`에 개발 프로젝트가 보인다
- [ ] secret 키를 쓰면(`admin-api` 확장) Sensitive로 등록했다. 이름에 `NEXT_PUBLIC_`이 없다
- [ ] 빌드 로그에 `Done in … using pnpm v12.x`와 `Lockfile passes supply-chain policies`가 보인다. `package.json`의 `packageManager`가 있으면 Vercel이 그 버전을 쓴다(실측 2026-09-30). 환경 변수 `ENABLE_EXPERIMENTAL_COREPACK`=`1`은 보험으로 넣어 둔다
- [ ] 미리 보기 배포에 로그인 보호가 켜져 있다: Settings › Deployment Protection › Vercel Authentication, 범위 Standard Protection. 운영 주소는 열리고 미리 보기·생성 주소는 Vercel 팀원만 연다
- [ ] 함수 리전이 Supabase 프로젝트와 같은 곳이다(`vercel.json`의 `regions`, 서울이면 `icn1`). 배포 요약(Resources)의 Function Region으로 확인한다
- [ ] Skew Protection이 켜져 있다(Settings › Advanced). 배포 직후 열려 있던 화면이 옛 서버 액션을 불러 오류가 나는 것을 막는다. 화면을 오래 열어 두는 도구면 최대 유지 기간을 늘린다
- [ ] Git Fork Protection이 켜져 있다(기본값). 포크에서 온 PR은 승인 전에 배포되지 않는다
- [ ] 브라우저용 소스맵을 켜지 않았다(`productionBrowserSourceMaps`)
- [ ] (선택) PR의 Vercel 봇 댓글과 `deployment_status` 알림이 시끄러우면 Settings › Git에서 끈다. Claude 리뷰 댓글과 겹친다

## 5. 저장소

- [ ] 비밀 값 탐지와 push 보호를 켰다(GitHub: Secret scanning, Push protection)
- [ ] `.env.local`이 커밋되지 않았다: `git ls-files | grep -E '^\.env'`의 결과가 `.env.example`뿐이다
- [ ] 기본 브랜치에 직접 push 하지 못하게 했다: 브랜치 보호에서 `verify`를 필수 검사로 걸고 **"Include administrators"(관리자에게도 적용)를 켠다.** 켜지 않으면 저장소 소유자의 직접 push는 그대로 들어간다(실측). GitHub Free는 공개 저장소에서만 브랜치 보호가 된다

## 6. 개인정보

이 도구가 개인정보를 다루면 확인한다. 법률 자문이 아니다. 회사의 개인정보 보호책임자와 확인한다.

- [ ] 다루는 개인정보 항목을 `docs/schema.md`에 표시했다
- [ ] 주민등록번호·여권번호·운전면허번호·외국인등록번호·계좌번호·카드번호를 저장하지 않는다. 저장해야 하면 암호화 방법을 정했다. 검사(`pnpm check:migrations`)는 열 이름만 본다. `-- sensitive-ok`가 적힌 마이그레이션이 있으면 사유를 직접 읽었다
- [ ] 연락처·주소처럼 모두가 볼 필요가 없는 개인정보가 `profiles`(모든 로그인 사용자가 읽는다)에 들어 있지 않다
- [ ] 접속 기록을 보관할 방법을 정했다. Supabase의 기본 로그는 보관 기간이 짧다(요금제에 따라 며칠에서 몇 주)
- [ ] 역할 변경 이력(`user_role_events`)을 지우지 않는다
- [ ] 퇴사자·이동한 사람의 계정과 역할을 바로 거둔다. 담당: 《이름》
