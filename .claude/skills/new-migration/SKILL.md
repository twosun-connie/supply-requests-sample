---
name: new-migration
description: 테이블·열·인덱스·정책·권한 코드를 더하는 마이그레이션을 만든다. 화면을 만들다 DB를 바꿔야 할 때, 사용자가 "테이블 만들자", "열 추가하자", "권한 추가하자"고 할 때 쓴다.
argument-hint: "[무엇을 더하는가]"
allowed-tools: Bash(pnpm supabase migration new *) Bash(pnpm check:migrations) Bash(pnpm test) Bash(pnpm exec vitest run *) Bash(pnpm db:types) Bash(pnpm typecheck)
---

# 마이그레이션: $ARGUMENTS

1. **읽는다.** `.claude/rules/database.md`, `.claude/rules/security.md` §6(개인정보), `docs/schema.md`, `docs/permissions.md`, `docs/rules.md`, 그리고 `supabase/migrations/`의 최근 파일.
2. **문서를 먼저 맞춘다.** `docs/rules.md`의 데이터 항목이나 `docs/permissions.md`의 표에 없는 것이면, 더할 줄을 제안하고 승인을 받는다.
3. **종류를 가른다.**

| 요청 | 하는 일 |
|---|---|
| 테이블·열·인덱스 더하기 | 4번으로 간다 |
| 권한 코드·역할 더하기 | 파일을 둘로 나눈다: enum 값 더하기 / 그 값 쓰기(`database.md` §4) |
| 정책 고치기 | `drop policy if exists` 뒤에 새 정책 |
| 지우기·이름 바꾸기·종류 바꾸기 | 한 번에 하지 않는다. `database.md` §5의 단계 가운데 지금 할 단계만 한다. 나머지 단계는 보고에 적는다. `docs/schema.md`에는 두 열을 모두 적는다 |
| 함수·트리거 | `/add-extension db-functions`가 먼저다 |
| 주민등록번호·여권번호·계좌번호·카드번호 등을 담는 열 | **만들지 않는다.** 멈추고 사용자에게 알린다(`security.md` §6). 요청의 나머지 부분만 진행한다 |
| 연락처·주소·생년월일 같은 개인정보 열 | 그 테이블의 select 정책을 읽고 계획에 "누가 읽는가"를 적는다. 모두가 읽는 테이블(`profiles`)이면 별도 테이블을 제안한다 |

4. **기록을 열고 계획을 보여 준다.** `pnpm docs:new work 《이름》`. 기록에 적는 계획: 파일 이름, 테이블과 열(종류·필수·기본값·뜻), 권한(grant), 정책(작업별로 누가 어느 행을), 개인정보 열과 그 열을 읽는 사람, 인덱스, 정책으로 막지 못해 서버 액션이 검사할 규칙. 승인을 기다린다.
5. **파일을 만든다.** `pnpm supabase migration new 《이름》`. 만들어진 빈 파일에 쓴다. 새 테이블이면 `database.md` §2의 묶음을 빠짐없이 쓴다.
6. **DB 테스트를 쓴다.** 새 테이블이면 `test/db/《테이블》.rls.test.ts`. 본보기는 `test/db/rbac.rls.test.ts`. 권한 있는 사용자, 권한 없는 사용자, 남의 행, 로그인하지 않은 요청.
7. **검사한다.** `pnpm check:migrations`와 `pnpm test:db`. 둘 다 돌린다. DB 테스트는 마이그레이션을 실제로 적용해 본다. 적용에 실패하면 모든 DB 테스트가 실패한다. 구조 검사가 실패하면 `test/db/support/`가 아니라 마이그레이션을 고친다.
8. **문서를 고친다.** `docs/schema.md`의 열 목록과 변경 기록. `destructive-ok`·`sensitive-ok`를 적었으면 결정 기록(`pnpm docs:new decision 《이름》`)도 쓴다. 작업 기록은 사용자가 적용을 끝낼 때까지 「진행 중」으로 둔다.
9. **멈춘다.** 아래를 출력하고 사용자가 적용을 끝냈다고 할 때까지 화면 코드를 쓰지 않는다.
10. **적용 뒤.** `pnpm db:types` → `pnpm typecheck`. 타입 오류가 나면 옛 열을 쓰는 코드다. 고친다.

## 9번에서 출력할 것

```text
검사표
□ 새 열은 NULL 허용 또는 기본값이 있다
□ 지우기·이름 바꾸기·종류 바꾸기가 없다(또는 단계별 제거의 《N》단계다)
□ 새 테이블에 grant + RLS + 작업별 정책이 있다
□ 암호화해야 하는 정보(주민등록번호 등)의 열이 없다. 개인정보 열은 읽는 사람을 확인했다
□ pnpm check:migrations 통과, pnpm test:db 통과(실제 출력을 붙인다)
□ docs/schema.md 를 고쳤다

사람이 실행할 명령
  pnpm db:push          ← 개발 DB 에 적용. 대상 프로젝트 이름을 확인한다
끝나면 "적용했다"고 알려 주세요. 이어서 DB 타입을 다시 만들고 화면을 만듭니다.
```
