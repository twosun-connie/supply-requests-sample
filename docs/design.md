# 디자인 규칙

## 방향

업무용 도구. 장식보다 읽기 쉬움. 한 화면에 한 가지 일.

## 테마

- shadcn/ui 프리셋: 기본값(base-nova).
- 색·모서리는 `app/theme.css`의 변수만 고친다. 기본색: 파란 계열 oklch(0.52 0.19 262). 모서리 0.5rem.
- 글꼴: Noto Sans KR. 본문 14px, 제목 24px.
- 다크 모드: 쓰지 않는다.

## 화면 뼈대 (템플릿이 준다)

- 관리자 도구 뼈대(shadcn admin kit 방식): 왼쪽 사이드바(`components/app-sidebar.tsx`, 접으면 아이콘만) + 위 띠(`components/app-topbar.tsx`: 여닫기 · 빵부스러기 · 사용자 메뉴) + 본문 + 아래 띠. 메뉴는 `lib/navigation.ts`(아이콘·묶음·권한 코드).
- 본문은 가운데, 최대 폭 `max-w-7xl`, `px-4 py-6 sm:px-6`(`app/(app)/layout.tsx`). 폼 화면은 `max-w-xl`.
- 모든 화면은 `PageHeader`(제목·설명·주 동작)로 시작한다. 목록은 `rounded-lg border bg-card` 상자 안의 표, 빈 상태는 `EmptyState`.
- 상세: 정보 상자(`bg-card`) → 처리 정보 상자(`bg-muted/40`) → 동작 폼.

## 화면 공통 규칙

- 목록: 20행, 최신순, 쪽 번호
- 날짜: `YYYY-MM-DD`(한국 시간). 돈: 쉼표를 넣은 원 단위
- 상태 네 가지(빈·로딩·오류·성공)를 만든다
- 375px 폭에서 가로 스크롤이 없다
- 상태는 `Badge`로 보여 준다: 제출, 승인, 반려

## 쓰는 블록 목록 (shadcn studio, 무료)

| 화면 | 블록 이름 | 무료/Pro | 넣은 날 | 비고 |
|---|---|---|---|---|
| 앱 뼈대 | application-shell-01 | 무료 | 2026-09-30 | 구조만 참고. 사이드바·위 띠는 shadcn/ui `sidebar`·`breadcrumb`·`dropdown-menu` 로 직접 조립 |
| 로그인 | login-page-01 | 무료 | 2026-09-30 | 카드와 배경 도형만. 빠른 로그인·가입·구글 로그인은 지움 |
| 대시보드 | statistics-component-01 | 무료 | 2026-09-30 | 통계 카드. 예제 문구 지움 |

## 하지 않는 것

- 애니메이션, 다크 모드 전환 버튼.
