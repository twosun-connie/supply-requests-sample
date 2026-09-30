# 확장-db-functions

- 날짜: 2026-09-30
- 상태: 확정
- 정한 사람: 사용자(실제 Supabase 검증 중 위임)
- 관련 작업: 2026-09-30-실제-supabase-vercel-검증.md

## 배경

관리자 API 로 만든 사용자와 초대로 가입한 사용자의 profiles 행을 아무도 만들지 않아 사용자 관리 화면이 비어 있었다(실제 Supabase 에서 발견).
## 선택지

| 선택지 | 좋은 점 | 나쁜 점 |
|---|---|---|
| auth.users 트리거로 profiles 생성 | API 를 직접 불러도 빠지지 않는다 | DB 함수·트리거 확장이 필요하다 |
| 로그인 뒤 서버 액션에서 upsert | 코드만으로 된다 | 첫 로그인 전에는 목록에 없다. 화면 밖 경로(API 직접 호출)에서 빠진다 |
## 결정

트리거를 쓴다. 방식 파일 .claude/skills/add-extension/recipes/db-functions.md 를 따른다: private 스키마, security definer + set search_path = '', anon·authenticated 의 실행 권한 회수. 마이그레이션 `20260930045036_create_profile_on_signup.sql`.
## 영향

- 바뀌는 것: project.config.json 의 extensions 에 db-functions, 마이그레이션 1개, DB 테스트의 profiles 삽입을 upsert 로
- 되돌리는 방법: 트리거와 함수를 지우는 마이그레이션(destructive-ok)
- 다시 볼 때: 이름 규칙(이메일 앞부분)이 업무에 맞지 않을 때
