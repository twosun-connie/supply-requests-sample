---
name: new-screen
description: 화면 목록(docs/screens.md)의 화면 하나를 만든다. 사용자가 "화면 만들자", "○○ 화면 시작하자"고 할 때 쓴다.
argument-hint: "[화면 이름]"
allowed-tools: Bash(pnpm verify) Bash(pnpm verify:quick) Bash(pnpm exec vitest run *)
---

# 새 화면: $ARGUMENTS

화면 이름이 비어 있으면 `docs/screens.md`의 목록을 보여 주고 어느 것인지 묻는다.

1. **읽는다.** `.claude/rules/conventions.md` §1·§3(이름, 주석), `docs/screens.md`의 해당 행, `docs/rules.md`, `docs/permissions.md`, `docs/design.md`, `docs/schema.md`, `.claude/rules/data-access.md`, `.claude/rules/ui.md`, 그리고 참조 구현 `app/(app)/admin/users/` 전체. 화면 목록에 행이 없으면 만들지 않고 `/write-docs`를 제안한다.
2. **브랜치를 알린다.** `git checkout -b feat/《화면-영문-이름》`. 실행은 사용자가 한다.
3. **기록을 열고 계획을 보여 준다.** `pnpm docs:new work 《화면-이름》`. 요청과 아래 계획을 기록에 적고 승인을 기다린다.
   - 만들 파일과 파일마다 하는 일
   - 배치: `docs/design.md` 「화면 뼈대」의 어느 형태인가(목록·상세·폼), 「쓰는 블록 목록」에서 쓸 블록(목록에 없는 블록이 필요하면 `/add-block`을 먼저 한다)
   - 쓰는 테이블·열, 필요한 권한 코드
   - DB 변경: 없음 / 있음(있으면 `/new-migration`을 먼저 하고, 사용자가 적용을 끝낸 뒤 돌아온다)
   - 필요한 shadcn/ui 컴포넌트 가운데 아직 없는 것(설치 명령)
   - **하지 않을 것**
4. **만든다.** `docs/schema.md`에 없는 열을 쓰지 않는다. 이름은 파일마다 정해진 형식을 따르고(`conventions.md` §1), 내보내는 것마다 바로 위에 `/** … */`로 무엇을 하는지와 코드로 알 수 없는 것(권한, 없을 때 돌려주는 값)을 쓴다. `pnpm check:conventions`가 확인한다.

| 순서 | 파일 | 확인할 것 |
|---|---|---|
| 1 | `schema.ts` | 폼이 있을 때. Zod. 문구는 존댓말 |
| 2 | `rules.ts`, `rules.test.ts` | 상태 전이·계산이 있을 때만. 규칙 문장마다 테스트. 없으면 파일을 만들지 않는다 |
| 3 | `queries.ts` | `import "server-only"`, 필요한 열만, 쪽 나누기. 행 하나를 읽는 조회는 없으면 `null`을 돌려준다(예외를 던지지 않는다). 검색어는 `toContainsPattern()`, 정렬은 허용 목록(`security.md` §3) |
| 4 | `actions.ts` | `data-access.md` §4의 순서. 반환은 `ActionResult` |
| 5 | `page.tsx`, `loading.tsx`, `error.tsx` | 조회보다 먼저 `requireUser()` 또는 `requirePermission()`. 주소에 ID를 받으면 행이 없을 때 `notFound()`. `<main>` 없이 `PageHeader`로 시작, 빈 상태는 `EmptyState`, `loading.tsx`는 `PageSkeleton`, `error.tsx`는 `ErrorState`(`docs/design.md` 「화면 뼈대」「상태」) |
| 5-1 | `lib/navigation.ts` | 최상위 화면이면 `NAV_ITEMS`에 한 줄(`icon`은 lucide-react, `group`은 사이드바 묶음 이름). 하위 화면의 주소 조각은 `SEGMENT_LABEL`에. `docs/screens.md`의 순서대로 |
| 6 | `《이름》-form.tsx` | 상호작용이 있는 조각만 `"use client"` |

5. **검증한다.** `pnpm verify`. 실패하면 고치고 다시 돌린다. 끝에 나오는 규칙 대응표에서 이 화면의 규칙에 "테스트 없음"이 있으면 빠뜨린 것이다. 구현과 테스트를 더한다.
6. **기록을 닫고 보고한다.** 기록의 「한 일」「검증」「하지 않은 것」「사람이 할 일」을 채우고 상태를 「완료」로 바꾼 뒤 아래를 출력한다.

## 6번에서 출력할 것

```text
만든 파일 / 검증 결과(실제 출력) / 이 화면의 규칙과 테스트(docs/rules.md 의 문장 → 테스트 파일) / 하지 않은 것

브라우저에서 계정별로 확인할 것
  《권한이 없는 역할》 계정: 보여야 하는 것 / 보이면 안 되는 것
  《권한이 있는 역할》 계정: 보여야 하는 것 / 할 수 있어야 하는 것
  공통: 상태 흐름표에 없는 버튼이 없다. 빈·로딩·오류 문구가 보인다.
        375px 폭에서 가로 스크롤이 없다. Tab 키로 모든 동작에 닿는다.

사람이 실행할 명령
  pnpm dev              ← 브라우저에서 확인
  git add -A && git commit -m "feat(《화면》): 《요약》"
```
