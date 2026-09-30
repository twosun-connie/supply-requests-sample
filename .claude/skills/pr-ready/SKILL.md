---
name: pr-ready
description: 끝낸 작업을 커밋·PR로 올릴 수 있는 상태로 만든다. 전체 검증과 보안 검토를 거쳐 PR 본문을 쓴다. 구현을 끝냈을 때 쓴다.
argument-hint: "[기준 브랜치]"
disable-model-invocation: true
allowed-tools: Bash(pnpm verify) Bash(pnpm check:deps) Bash(pnpm check:docs --final) Bash(pnpm report:scale) Bash(pnpm report:docs) Bash(pnpm check:commit *) Bash(pnpm check:conventions) Bash(git diff *) Bash(git status *) Bash(git log *)
---

# PR 준비: 기준 브랜치 $ARGUMENTS

기준 브랜치가 비어 있으면 저장소의 기본 브랜치를 쓴다. 푸시하지 않는다. 커밋은 사용자가 요청했을 때만 한다.

1. **범위를 확인한다.** `git status`와 `git diff 《기준》...HEAD --stat`. 요청한 작업과 관계없는 변경이 섞여 있으면 멈추고 보고한다.
2. **크기를 확인한다.** 생성물(`database.types.ts`, 잠금 파일, `components/ui/`)을 뺀 변경이 400줄을 넘거나 목적이 둘 이상이면 나눌 단위를 제안한다(예: 마이그레이션 → 화면).
3. **전체 검증을 돌린다.** `pnpm verify`. 실패하면 원인을 고친다. 검사를 끄거나 건너뛰지 않는다. 고칠 수 없으면 멈추고 실패 내용을 보고한다.
4. **검토를 받는다.** `security-reviewer`와 `code-reviewer` 서브에이전트를 부른다. 「중요」와 「매우 높음」은 고치고 다시 검토한다. 「높음」은 고치거나 작업 기록의 「하지 않은 것」에 이유와 함께 적는다. 검토자가 낸 「다음에 막을 것」은 기록의 같은 절에 옮긴다. `package.json`이 바뀌었으면 `pnpm check:deps`도 돌린다.
   - **기록을 닫는다.** 작업 기록의 상태를 「완료」로 바꾸고 `pnpm check:docs --final`을 돌린다. 결정 기록이 「제안」이면 사용자에게 확정을 요청한다.
5. **DB 변경을 확인한다.** 새 마이그레이션이 있으면 개발 DB에 적용했는지(`supabase/.pushed`), `database.types.ts`를 다시 만들었는지, `docs/schema.md`를 고쳤는지 본다.
6. **커밋을 나눈다.** `.claude/rules/git.md`의 형식으로 커밋 메시지를 제안한다. 커밋 하나에 목적 하나. 마이그레이션은 화면 코드와 다른 커밋으로 나눈다. 메시지마다 `pnpm check:commit "《메시지》"`로 확인한다. 브랜치 이름이 `종류/짧은-이름`이 아니면 `git branch -m`을 제안한다.

```text
feat(requests): 신청 상세에 승인·반려 버튼 추가

담당자가 목록에서 바로 처리할 수 없어 상세 화면을 만들었다.
자기 신청은 승인할 수 없다(docs/rules.md 「승인」).

Refs: docs/work/2026-09-30-신청-상세.md
```

7. **PR 제목과 본문을 쓴다.** 제목은 커밋과 같은 형식(`종류(범위): 요약`)이다. 합칠 때 이 제목이 `main`의 커밋 제목이 된다. 본문은 `.github/pull_request_template.md`의 절을 **지우지 않고** 채운다(무엇을, 왜 / 확인 방법 / 검증 / 화면 캡처 / DB 변경 / 하지 않은 것과 남은 것). 해당 없으면 「없음」. 검증 결과는 실제 출력에서 옮긴다. 지어내지 않는다. 「하지 않은 것과 남은 것」 끝에 `pnpm report:scale`의 알림이 있으면 옮긴다. `《…》`를 남기지 않는다(`pr-format` 검사가 막는다).

## 끝낼 때 출력

```text
커밋(목적마다 하나)
  《종류(범위): 요약》
  《종류(범위): 요약》

PR 제목
  《종류(범위): 요약》
PR 본문
  《양식을 채운 것》

사람이 실행할 명령
  git add 《파일》 && git commit -F - <<'MSG' … MSG     ← 커밋마다
  git push -u origin 《브랜치》
  gh pr create --title "《PR 제목》" --body-file 《본문 파일》
```
