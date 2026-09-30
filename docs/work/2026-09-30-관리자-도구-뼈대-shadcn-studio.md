# 관리자-도구-뼈대-shadcn-studio

- 날짜: 2026-09-30
- 상태: 완료
- 요청: 그래도 UI가 허접하다. 일반적인 shadcn admin kit 과 유사한 레이아웃과 스타일, shadcn studio 의 admin kit·ui kit 활용. 우선 무료, 나중에 Pro
- 근거 문서: docs/design.md 「화면 뼈대」「쓰는 블록 목록」, docs/screens.md 「대시보드」

## 계획

- 바꿀 파일: app/(app)/layout.tsx, components/{app-sidebar,app-topbar,user-menu,app-logo,empty-state}.tsx, lib/navigation.ts, app/theme.css, app/layout.tsx, 로그인 화면, 대시보드 화면(신규), components/ui(sidebar·breadcrumb·dropdown-menu·avatar·tooltip·sheet·skeleton), components/shadcn-studio/blocks
- 쓰는 테이블과 권한 코드: requests(건수), requests.approve·users.manage(메뉴·범위 표시)
- 마이그레이션: 없음
- 하지 않을 것: Pro 블록, 차트, 데이터 표 라이브러리(@tanstack/react-table)

## 결정

| 정한 것 | 고른 것 | 다른 선택지 | 이유 | 정한 사람 |
|---|---|---|---|---|
| 뼈대 | 사이드바 + 위 띠(shadcn/ui sidebar 로 직접 조립) | studio application-shell-01 을 그대로 | 예제 메뉴·언어·소셜 아이콘을 지우면 남는 것이 shadcn/ui sidebar 조립뿐이고, 메뉴를 권한 코드로 걸러야 한다 | AI(사용자 확인 전) |
| studio 블록 | 무료 3종(login-page-01, statistics-component-01, application-shell-01 참고) | Pro | 우선 무료 | 사용자 |
| 새 패키지 | 없음 | dashboard-shell-01(@tanstack/react-table, 차트) | 새 UI 라이브러리를 늘리지 않는다 | AI(사용자 확인 전) |

## 한 일

- 사이드바(아이콘·묶음·접기·모바일 서랍), 위 띠(빵부스러기), 사용자 메뉴(이메일·역할·로그아웃), 아래 띠
- 로그인 화면: studio login-page-01 의 카드·배경 도형 + 우리 로그인 폼
- 대시보드: 상태별 건수 카드(studio statistics-card), 세 조회는 Promise.all
- 예제 페이지(app/*-01)와 예제 내용(소셜 아이콘, 언어 선택, 가짜 프로필)을 지움
- docs/design.md 에 쓰는 블록 목록, docs/screens.md 에 대시보드
- lib/supabase/proxy.ts: 공개 경로를 경로 단위로 판정(/login 과 /login/ 아래만)
- 템플릿 v1.8.0 의 규칙·검사 반영: /add-block 스킬, check:app(예제 페이지·예제 내용), report:scale(shadcn CLI 가 만든 파일 제외)

## 검증

- `pnpm verify`: 통과
- 브라우저: 운영 주소 스크린샷(로그인, 대시보드, 목록, 상세, 사용자 관리, 375px)

## 하지 않은 것

- 데이터 표의 열 정렬·열 숨기기(studio data-table 은 @tanstack/react-table 이 필요)
- 다크 모드 전환

## 사람이 할 일

- [ ] 운영 주소에서 세 계정으로 메뉴(권한별)와 화면을 본다
- [ ] Pro 로 올리면 components.json 에 @ss-blocks 등을 더하고 EMAIL·LICENSE_KEY 를 .env.local 에 넣는다

## 다음에 막을 것

- studio 블록을 넣으면 app/(블록 이름)/page.tsx 예제 페이지가 딸려 온다 — 지우는 것을 잊으면 예제가 열린다. 공개 경로를 앞 글자로 판정해서 /login-page-01 은 로그인 없이도 열렸다(운영 주소에서 307 대신 404 로 확인) — check:app 에 뼈대 밖의 화면 검사를 더하고, lib/supabase/proxy.ts 는 경로 단위로 판정한다
- shadcn add 가 파일 덮어쓰기를 물으며 멈춘다 — 터미널이 아니면 중단된다 — 명령 앞에 `yes n |` 를 붙이는 절차를 적는다
