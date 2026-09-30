# 디자인 규칙

## 방향

《한두 문장. 예: 업무용 도구. 장식보다 읽기 쉬움. 한 화면에 한 가지 일. 밝은 배경, 촘촘한 표.》

## 테마

- shadcn/ui 프리셋: 기본값(`base-nova`). 다른 프리셋을 쓰면 여기에 이름을 적는다.
- 색·모서리는 `app/theme.css`의 변수만 고친다(`globals.css`는 shadcn CLI가 관리한다). 기본색(`--primary`): 《파란 계열 oklch(0.52 0.19 262) / 회사 색》. 모서리(`--radius`): 《0.5rem》.
- 글꼴: 《Noto Sans KR(next/font/google) / 회사 글꼴》. 본문 14px(`text-sm`), 제목 24px(`text-2xl font-bold`).
- 다크 모드: 《쓰지 않는다 / 시스템 설정을 따른다》.

## 화면 뼈대 (템플릿이 준다. 바꾸지 않고 채운다)

- **관리자 도구 뼈대**(shadcn admin kit 방식, `app/(app)/layout.tsx`): 왼쪽 사이드바(`components/app-sidebar.tsx`, 접으면 아이콘만, 좁은 화면은 서랍) + 위 띠(`components/app-topbar.tsx`: 여닫기 · 빵부스러기 · 사용자 메뉴) + 본문 + 아래 띠. 메뉴는 `lib/navigation.ts`(아이콘 · 묶음 · 권한 코드).
- **본문**: 최대 폭 `max-w-7xl`, 안쪽 여백 `px-4 py-6 sm:px-6`. 폼 화면은 `max-w-xl`의 `Card` 안.
- **화면 머리**(`components/page-header.tsx`): 제목 · 한 줄 설명 · 오른쪽에 주 동작 버튼 하나. 모든 화면이 이것으로 시작한다.
- **목록 화면**: 화면 머리 → 필터(주소의 쿼리) → 표(`rounded-lg border bg-card` 상자 안의 `Table`) → "전체 N건 · 쪽" 과 이전·다음.
- **상세 화면**: 화면 머리(제목에 번호, 오른쪽에 상태 `Badge`와 「목록으로」) → 정보 상자(`rounded-lg border bg-card p-4`, 이름표는 `text-sm text-muted-foreground`, 값은 `font-medium`) → 처리 정보 상자(`bg-muted/40`) → 동작 폼.
- **폼 화면**: 화면 머리 → `Field` 세로 나열 → 맨 아래 주 버튼과 취소 링크.
- **로그인**: 가운데 카드(`Card`), 위에 로고(`components/app-logo.tsx`)와 한 줄 설명(`project.config.json`). 가입 링크·소셜 로그인은 없다.
- **대시보드**(있을 때): 화면 머리 → 통계 카드 2~4개(`grid gap-4 sm:grid-cols-2 lg:grid-cols-4`) → 최근 항목 표.

## 상태

- 빈 상태: `components/empty-state.tsx`. 제목("아직 신청이 없습니다") + 다음에 할 일 한 문장 + 필요하면 버튼.
- 로딩: `loading.tsx`. 오류: `error.tsx`에 다시 시도 버튼.
- 상태 값은 `Badge`로: 《제출 = outline, 승인 = default, 반려 = destructive》.

## 화면 공통 규칙

- 목록: 20행, 최신순, 쪽 번호
- 날짜: `YYYY-MM-DD`(한국 시간). 돈: 쉼표를 넣은 원 단위
- 375px 폭에서 가로 스크롤이 없다(표는 `overflow-x-auto` 상자 안)
- 색 이름 클래스(`bg-blue-500`)를 쓰지 않는다. 뜻으로 된 클래스(`bg-primary`, `text-muted-foreground`)만

## 쓰는 블록 목록 (shadcn studio)

화면의 배치를 가져올 블록이다. 여기에 없는 블록은 넣기 전에 묻는다(`/add-block`). 앱 뼈대 블록은 넣지 않는다.

| 화면 | 블록 이름 | 무료/Pro | 넣은 날 | 비고 |
|---|---|---|---|---|
| 《로그인》 | 《login-page-01》 | 《무료》 | 《YYYY-MM-DD》 | 《카드와 배경만. 가입·소셜 로그인은 지움》 |

## 하지 않는 것

- 《애니메이션, 다크 모드 전환 버튼, 차트 등 이번에 넣지 않는 것》
- 앱 뼈대를 바꾸는 블록(`application-shell-*`, `dashboard-shell-*`)
