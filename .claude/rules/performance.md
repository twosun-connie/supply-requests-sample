---
paths:
  - "app/**"
  - "features/**"
  - "components/**"
---

# 성능 규칙 (영향이 큰 순서)

효과가 큰 것부터 본다. 위 두 단계가 남아 있는 동안에는 아래 단계를 손대지 않는다. 근거는 설치된 Next.js의 문서다(`node_modules/next/dist/docs/01-app/`). 수치를 재지 않고 "빨라졌다"고 쓰지 않는다.

## 1. 기다림을 줄인다 (매우 높음)

- 서로의 결과가 필요 없는 조회는 **함께 시작한다.** `await`를 줄줄이 쓰면 앞의 조회가 끝나야 다음이 시작된다 [문서: `01-getting-started/06-fetching-data.md` Parallel data fetching].

```ts
// 나쁨: 품목 조회가 끝나야 신청 조회가 시작된다
const items = await listItems();
const requests = await listRequests();

// 좋음
const [items, requests] = await Promise.all([listItems(), listRequests()]);
```

- 하나가 실패해도 나머지를 보여 줘야 하면 `Promise.allSettled`를 쓴다.
- 반복문 안에서 조회하지 않는다. ID를 모아 `.in("id", ids)` 한 번으로 읽거나 관계를 함께 읽는다(`select("id, items(name)")`).
- 한 요청에서 같은 조회를 여러 컴포넌트가 부르면 `cache()`로 감싼다 [문서: 같은 파일, Reusing data with `React.cache`]. `lib/auth.ts`가 이 방식이다.
- 느린 조각 때문에 화면 전체가 늦어지면 그 조각을 `<Suspense>`로 감싼다. 화면 전체의 로딩은 `loading.tsx`다 [문서: 같은 파일, Streaming].

## 2. 브라우저로 보내는 코드를 줄인다 (매우 높음)

- `"use client"`는 상호작용이 있는 가장 작은 조각에만 붙인다. 붙인 파일이 불러오는 것은 모두 브라우저로 간다.
- 데이터를 화면으로 바꾸기만 하는 일(표 계산, 날짜·금액 형식, 마크다운)은 서버 컴포넌트에서 한다 [문서: `02-guides/package-bundling.md` Heavy client workloads].
- 처음 화면에 보이지 않는 무거운 클라이언트 조각(차트, 편집기, 엑셀 미리 보기)은 `next/dynamic`으로 나눈다 [문서: `02-guides/lazy-loading.md`]. 서버 컴포넌트가 클라이언트 컴포넌트를 `dynamic`으로 불러오면 코드가 나뉘지 않는다. 클라이언트 컴포넌트 안에서 부른다.
- 내보내는 것이 수백 개인 패키지(아이콘 등)를 새로 넣으면 `optimizePackageImports`의 대상인지 확인한다 [문서: `03-api-reference/05-config/01-next-config-js/optimizePackageImports.md`]. `next.config.ts`를 고치는 것은 사용자에게 제안한다.

## 3. 필요한 만큼만 읽는다 (높음)

- 열 이름을 적는다(`select('*')` 금지). 목록은 20행씩 읽는다. 클라이언트 컴포넌트에는 화면에 쓰는 값만 넘긴다.
- 검색·정렬·거르기에 쓰는 열에 인덱스가 있는지 본다. 없으면 `/new-migration`으로 더할 것을 제안한다.

## 4. 다시 그리기 (낮음)

- `useMemo`·`useCallback`·`memo`를 미리 넣지 않는다. 느린 것을 확인한 곳에만 넣는다.
- 상태는 쓰는 조각 가까이에 둔다. 주소에 둘 수 있는 값(검색어, 정렬, 쪽 번호)은 주소에 둔다.

## 검사가 보지 못한다

이 파일의 규칙은 `pnpm verify`가 보지 못한다. PR을 준비할 때 `code-reviewer`가 본다. Vercel의 `react-best-practices` 스킬을 설치했으면(`.claude/skills/`에 있다) 검토자가 그 기준도 함께 본다. 설치는 사용자가 한다(템플릿 `README.md` §11).
