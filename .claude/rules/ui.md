---
paths:
  - "app/**/*.tsx"
  - "app/**/*.css"
  - "components/**"
  - "features/**/*.tsx"
---

# 화면 규칙 (shadcn/ui, Tailwind 4)

디자인의 원본은 `docs/design.md`다. 시안이 있으면 배치를 따르되 시안의 코드는 쓰지 않는다.

## 1. 컴포넌트

- 화면은 템플릿의 뼈대 위에 만든다: 사이드바와 위 띠는 `app/(app)/layout.tsx`가 그리므로 화면은 `<main>`을 만들지 않는다. 화면은 `PageHeader`(`components/page-header.tsx`)로 시작하고, 빈 상태는 `EmptyState`(`components/empty-state.tsx`), 표는 `rounded-lg border bg-card` 상자 안의 `Table`이다. 모양의 근거는 `docs/design.md` 「화면 뼈대」.
- 새 화면을 만들면 `lib/navigation.ts`의 `NAV_ITEMS`에 메뉴 한 줄을 더한다(상세·새 항목 같은 하위 화면은 넣지 않는다). 권한이 필요한 화면은 `permission`을 적는다.
- 화면의 배치를 shadcn studio 블록에서 가져올 때는 `/add-block`을 따른다: `docs/design.md`의 「쓰는 블록 목록」에 있는 것만, 앱 뼈대 블록은 넣지 않고, 예제 내용(가짜 데이터·영어 문구·외부 이미지·상표)과 예제 페이지(`app/《블록 이름》/`)를 지우고, 색은 변수로, 새 패키지가 딸려 오면 묻는다. 템플릿 자체에는 studio 코드를 넣지 않는다(라이선스: 템플릿·스타터 킷에 넣어 배포 금지).
- 색은 `app/theme.css`의 변수로 정한다. `globals.css`는 shadcn CLI가 관리하므로 고치지 않는다.
- `components/ui/`의 shadcn/ui 컴포넌트로 조립한다. 없는 컴포넌트는 `pnpm dlx shadcn@latest add 《이름》`을 사용자에게 제안한다(설치는 승인 뒤). 패키지 이름은 `shadcn`이다. 설치되기 전에 같은 이름의 파일을 손으로 쓰지 않는다. 이미 있는 컴포넌트로 조립하고 보고에 적는다.
- `components/ui/`의 파일을 직접 고치지 않는다. 바꿔야 하면 감싸는 컴포넌트를 `components/`에 만든다.
- 컴포넌트의 속성은 설치된 파일을 읽어 확인한다. shadcn/ui는 버전에 따라 기반 라이브러리(Base UI, Radix)가 달라 옛 예제와 속성이 다르다.
- 색·간격·글자 크기는 `app/globals.css`의 변수와 Tailwind 클래스만 쓴다. `#1a73e8`, `style={{ margin: 13 }}` 같은 값을 직접 적지 않는다.
- 색은 **뜻으로 된 클래스**를 쓴다: `bg-muted`, `text-muted-foreground`, `border-destructive`, `text-destructive`, `bg-accent`, `bg-card`. `bg-orange-50`, `text-red-500`처럼 색 이름과 숫자로 된 클래스를 쓰지 않는다. `pnpm check:app`이 막는다.
- 강조가 필요하면 `Badge`의 `variant`나 `border`, 글자 굵기로 한다. 필요한 색이 변수에 없으면 `docs/design.md`에 더할 것을 제안한다.
- 같은 화면 조각을 두 번 만들지 않는다. 먼저 `components/`와 `features/`에서 찾는다.

## 2. 서버와 클라이언트

- 기본은 서버 컴포넌트다. `"use client"`는 상태·이벤트가 있는 가장 작은 조각에만 붙인다(`《이름》-form.tsx`).
- 클라이언트 컴포넌트에 넘기는 값은 화면에 필요한 것만. DB 행 전체나 내부용 열을 넘기지 않는다.
- 클라이언트 컴포넌트에서 DB를 읽거나 바꾸지 않는다. 읽기는 서버 컴포넌트가 하고 바꾸기는 서버 액션이 한다.

## 3. 네 가지 상태

| 상태 | 만드는 것 |
|---|---|
| 빈 | 왜 비었는지와 다음에 할 일을 한 문장으로("아직 신청이 없습니다. 「새 신청」을 눌러 시작하세요.") |
| 로딩 | 라우트 폴더의 `loading.tsx`. `PageSkeleton`(`components/page-skeleton.tsx`)을 돌려준다. 문구만 띄우지 않는다 |
| 오류 | 라우트 폴더의 `error.tsx`. `ErrorState`(`components/error-state.tsx`)에 제목과 `reset`을 넘긴다. 예외 문구를 보여 주지 않는다 |
| 없음 | 행이 없거나 볼 수 없으면 조회는 `null`을 돌려주고 `page.tsx`가 `notFound()`. `app/(app)/not-found.tsx`가 그린다. 조회가 예외를 던지면 「오류」로 보인다 |
| 성공 | 바뀐 결과가 화면에 보인다. 필요하면 한 줄 알림 |

주소에 ID를 받는 페이지는 조회 결과가 없으면 `notFound()`를 부른다. 없는 행과 정책이 막은 행은 둘 다 0행으로 와서 구분되지 않는다. 본문에 "찾을 수 없습니다"를 그리면 응답이 200이다. `pnpm check:app`이 막는다.

권한이 없는 사용자에게는 버튼을 숨긴다(`hasPermission()`). 숨기는 것으로 끝내지 않고 서버 액션에서도 확인한다.

## 4. 폼

- `useActionState`로 서버 액션을 연결하고 shadcn/ui의 `Field` 계열로 조립한다.
- 검증은 서버 액션의 Zod 스키마(`schema.ts`)가 한다. 브라우저의 `required`, `maxLength`는 편의로만 쓴다.
- 보내는 동안 버튼을 끈다(`pending`). 두 번 눌러도 한 번만 처리된다.
- 오류 문구는 입력 옆에 보여 주고 `role="status"` 또는 `aria-invalid`로 읽히게 한다.
- 지우기·승인·반려처럼 되돌리기 어려운 동작은 한 번 더 묻는다.

## 5. 목록

- 서버에서 쪽을 나눈다. 20행, 최신순. 쪽 번호는 주소의 `?page=`에 둔다.
- 검색·필터도 주소의 쿼리에 둔다. 새로 고침하거나 주소를 공유해도 같은 화면이 나온다.
- 전부 가져와서 화면에서 거르지 않는다.
- 날짜는 `YYYY-MM-DD`(한국 시간), 돈은 쉼표를 넣은 원 단위.
- CSV 내려받기는 서버에서 만든다. 맨 앞에 UTF-8 BOM을 붙여 Excel에서 한글이 깨지지 않게 한다. 셀이 `=`, `+`, `-`, `@`로 시작하면 앞에 `'`를 붙인다.

## 6. 접근성과 반응형

- 375px 폭에서 가로 스크롤이 없다. 넓은 표는 표만 가로로 밀리게 감싼다.
- Tab 키로 모든 동작에 닿는다. 아이콘만 있는 버튼에는 `aria-label`을 준다.
- 입력마다 이름표(`FieldLabel`)가 있다. 자리 표시 글로 대신하지 않는다.
- 색만으로 상태를 구분하지 않는다. 글자나 아이콘을 함께 쓴다.

## 7. 문구

- 화면의 문구는 존댓말로, 짧게 쓴다. 코드의 주석은 평서문이다.
- 오류 문구는 무슨 일이 있었는지와 무엇을 하면 되는지를 말한다. "오류가 발생했습니다"로 끝내지 않는다.
- 같은 것을 같은 말로 부른다. 용어는 `docs/rules.md`를 따른다.
