---
name: pr-ready
description: 끝낸 작업을 커밋·PR로 올릴 수 있는 상태로 만든다. 전체 검증과 보안 검토를 거쳐 PR 본문을 쓴다. 구현을 끝냈을 때 쓴다.
argument-hint: "[기준 브랜치]"
disable-model-invocation: true
allowed-tools: Bash(pnpm verify) Bash(pnpm check:deps) Bash(pnpm check:docs --final) Bash(pnpm report:scale) Bash(pnpm report:docs) Bash(git diff *) Bash(git status *) Bash(git log *)
---

# PR 준비: 기준 브랜치 $ARGUMENTS

기준 브랜치가 비어 있으면 저장소의 기본 브랜치를 쓴다. 푸시하지 않는다. 커밋은 사용자가 요청했을 때만 한다.

1. **범위를 확인한다.** `git status`와 `git diff 《기준》...HEAD --stat`. 요청한 작업과 관계없는 변경이 섞여 있으면 멈추고 보고한다.
2. **크기를 확인한다.** 생성물(`database.types.ts`, 잠금 파일, `components/ui/`)을 뺀 변경이 400줄을 넘거나 목적이 둘 이상이면 나눌 단위를 제안한다(예: 마이그레이션 → 화면).
3. **전체 검증을 돌린다.** `pnpm verify`. 실패하면 원인을 고친다. 검사를 끄거나 건너뛰지 않는다. 고칠 수 없으면 멈추고 실패 내용을 보고한다.
4. **검토를 받는다.** `security-reviewer`와 `code-reviewer` 서브에이전트를 부른다. 「중요」와 「매우 높음」은 고치고 다시 검토한다. 「높음」은 고치거나 작업 기록의 「하지 않은 것」에 이유와 함께 적는다. 검토자가 낸 「다음에 막을 것」은 기록의 같은 절에 옮긴다. `package.json`이 바뀌었으면 `pnpm check:deps`도 돌린다.
   - **기록을 닫는다.** 작업 기록의 상태를 「완료」로 바꾸고 `pnpm check:docs --final`을 돌린다. 결정 기록이 「제안」이면 사용자에게 확정을 요청한다.
5. **DB 변경을 확인한다.** 새 마이그레이션이 있으면 개발 DB에 적용했는지(`supabase/.pushed`), `database.types.ts`를 다시 만들었는지, `docs/schema.md`를 고쳤는지 본다.
6. **PR 본문을 쓴다.** 검증 결과는 실제 출력에서 옮긴다. 지어내지 않는다.

```markdown
## 무엇을, 왜
《한두 문장》

## 확인 방법
- 《계정》으로 로그인 → 《경로》 → 《동작》 → 《기대하는 결과》

## 검증
- `pnpm verify`: 《통과 / 실패 내용》
- 보안 검토: 중요 《N》건 해결, 사소 《N》건 / 코드 검토: 매우 높음 《N》건 해결, 높음 《N》건
- 작업 기록: `docs/work/《파일》`
- 사람이 할 설정: 《없음 / docs/security-checklist.md 의 항목》

## 화면 캡처
《있으면》

## 문서·시안 변경
《없음 / 바꾼 문서》

## DB 변경
《없음 / 마이그레이션 파일 이름 · 바꾼 테이블과 열 · 새 권한 코드 · docs/schema.md 갱신함》
- 운영 적용: 머지(자동 배포) **직전에** 사람이 `pnpm db:push --prod`. DB가 앱보다 먼저다(더하기만 하는 변경이라 옛 앱도 동작한다)

## 하지 않은 것과 남은 것
- 《범위에서 뺀 것, 확인하지 못한 것, 단계별 제거의 남은 단계》

## 규모
《pnpm report:scale 의 출력》
```

커밋 메시지: `{type}({범위}): {요약}`. type은 `feat`, `fix`, `refactor`, `test`, `docs`, `chore` 가운데 하나, 요약은 한국어 한 줄. 마이그레이션은 화면 코드와 다른 커밋으로 나눈다.

## 끝낼 때 출력

```text
사람이 실행할 명령
  git add -A && git commit -m "《메시지》"
  git push -u origin 《브랜치》
```
