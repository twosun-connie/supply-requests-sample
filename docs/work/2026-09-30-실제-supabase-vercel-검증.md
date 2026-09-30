# 실제-supabase-vercel-검증

- 날짜: 2026-09-30
- 상태: 완료
- 요청: github 연동까지 포함해서 검증하고 싶다. 무료 플랜에서 진행해줘
- 근거 문서: 템플릿 docs/ai/evals.md §4(아직 실제로 확인하지 못한 것)

## 계획

- 바꿀 파일: supabase/config.toml(신규), supabase/project-refs.json, 마이그레이션(프로필 트리거), project.config.json, test/db/*.rls.test.ts, docs/schema.md
- 쓰는 테이블과 권한 코드: profiles, user_roles
- 마이그레이션: 20260930045036_create_profile_on_signup
- 하지 않을 것: 운영 프로젝트 생성, Claude PR 리뷰
## 결정

| 정한 것 | 고른 것 | 다른 선택지 | 이유 | 정한 사람 |
|---|---|---|---|---|
| 저장소 공개 범위 | 공개 | 비공개 | GitHub Free 는 공개 저장소에만 브랜치 보호가 된다 | AI(사용자 확인 전) |
| 프로필 생성 | DB 트리거 | 로그인 뒤 upsert | docs/decisions/2026-09-30-확장-db-functions.md | 사용자(위임) |
## 한 일

- `supabase/migrations/20260930045036_create_profile_on_signup.sql` — auth.users 트리거로 profiles 생성, 기존 사용자 backfill
- `supabase/config.toml` — 가입 차단, Custom Access Token 훅, Redirect URLs(미리 보기 패턴), 비밀번호 규칙. `pnpm supabase config push --project-ref` 로 적용
- `project.config.json` — extensions 에 db-functions
- `test/db/*.rls.test.ts` — profiles 삽입을 upsert 로(트리거가 먼저 만든다)
- `supabase/project-refs.json` — 개발 프로젝트 ID·리전
- `lib/supabase/database.types.ts` — pnpm db:types 로 재생성
- `docs/schema.md` — 변경 기록
## 검증

- `pnpm verify`: 통과(로컬)
- `pnpm db:push`: 개발 DB 에 적용. 관리자 API 로 사용자를 만들면 profiles 행이 생기는 것을 확인
- `pnpm supabase db advisors --linked --project-ref … --type security`: 경고 0건
- 이번 범위의 규칙과 테스트: 없음(업무 규칙 변경 없음). DB 테스트 40건 통과
## 하지 않은 것

- 운영 프로젝트 생성(무료 플랜 한도)
- 초대 메일 흐름(실제 메일 발송)
## 사람이 할 일

- [x] pnpm db:push(샘플에 한해 AI 가 실행)
- [ ] 운영 프로젝트를 만들면 SUPABASE_AUTH_SITE_URL 을 운영 주소로 두고 config push
## 다음에 막을 것

- 프로필 행이 만들어지지 않는 것을 DB 테스트가 잡지 못했다 — 테스트가 프로필을 직접 넣어서다 — 구조 검사에 "auth.users 에 insert 트리거가 있다" 항목을 더한다
- `db advisors` 명령이 틀렸다 — 실제로 돌려 보지 않았다 — README 와 확인표를 고친다
