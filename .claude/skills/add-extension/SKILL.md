---
name: add-extension
description: 새 종류의 기능을 정해진 방식으로 더한다. 파일 첨부(storage), 메일(email), 엑셀(excel), DB 함수·트리거(db-functions), 예약 작업(scheduled-jobs), Edge Function(edge-functions), secret 키를 쓰는 관리자 기능(admin-api), 여러 조직(multi-org), 실시간(realtime). 이런 기능을 처음 넣을 때, 또는 pnpm check:extensions 가 확장을 켜라고 알릴 때 쓴다.
argument-hint: "[확장 이름]"
allowed-tools: Bash(pnpm check:extensions) Bash(pnpm verify) Bash(pnpm test)
---

# 확장 더하기: $ARGUMENTS

확장은 막는 장치가 아니다. 처음 넣는 순간을 사용자에게 알리고, 안전한 방식을 읽고 시작하게 하는 절차다. 한 번 켜면 다시 묻지 않는다.

이름이 비어 있거나 목록에 없으면 아래 표를 보여 주고 묻는다.

| 이름 | 기능 | 먼저 생각할 것 |
|---|---|---|
| `storage` | 파일 첨부 | 누가 어느 파일을 볼 수 있는가 |
| `email` | 알림 메일 | 메일이 실패하면 업무 처리를 되돌리는가(되돌리지 않는다) |
| `excel` | 엑셀 내보내기·업로드 | CSV로 충분한가 |
| `db-functions` | DB 함수·트리거 | 서버 액션으로 충분한가. 우회되면 안 되는 규칙인가 |
| `scheduled-jobs` | 예약 작업 | DB 안에서 끝나는가, 앱 코드가 필요한가 |
| `edge-functions` | Supabase Edge Functions | Next.js의 Route Handler로 되는가 |
| `admin-api` | secret 키를 쓰는 관리자 기능 | 대시보드에서 해도 되는 일인가 |
| `multi-org` | 여러 조직 | 조직 사이에 데이터가 섞이면 안 된다 |
| `realtime` | 실시간 갱신 | 새로 고침이나 주기적 재조회로 충분한가 |

1. **방식을 읽는다.** 이 폴더의 `recipes/$ARGUMENTS.md` 전체와 `.claude/rules/database.md`.
2. **공식 문서로 확인한다.** 방식 파일의 「출처」를 열어 지금도 맞는지 본다. 방식 파일에 「확인 필요」로 적힌 것은 반드시 확인한다. 다르면 공식 문서를 따르고 다른 점을 보고한다.
3. **계획을 보여 준다.** 승인을 기다린다.
   - 왜 이 확장이 필요한가. 더 단순한 방법은 없는가
   - 필요한 패키지(설치 명령), 환경 변수(이름만), 대시보드 설정, 마이그레이션
   - 늘어나는 위험과 그것을 막는 방법
   - 사람이 해야 하는 일(키 발급, 대시보드 설정, 환경 변수 등록)
4. **기록한다.** 승인을 받으면 `project.config.json`의 `extensions`에 이름을 더하고, 결정 기록을 쓴다: `pnpm docs:new decision 확장-《이름》`(배경, 다른 방법, 고른 방식과 이유, 새 패키지·환경 변수·비용). 작업 기록이 아직 없으면 `pnpm docs:new work 《이름》`.
5. **문서를 먼저 고친다.** `docs/rules.md`의 「하지 않는 것」에 이 기능이 있으면 그 줄을 고치고, 데이터 항목·규칙·권한·화면을 더한다.
6. **DB부터 한다.** DB가 바뀌면 `.claude/skills/new-migration/SKILL.md`의 절차로 마이그레이션과 DB 테스트를 쓰고 `pnpm test:db`를 돌린다. **그리고 멈춘다.** 사용자가 `pnpm db:push`를 끝냈다고 할 때까지 화면·서버 액션 코드를 쓰지 않는다. 먼저 쓰면 DB 타입에 없는 테이블을 쓰게 되어 타입 검사가 실패한다.
7. **구현한다.** 사용자가 적용을 끝낸 뒤 `pnpm db:types` → 방식 파일의 「지킬 것」대로 구현.
8. **검증한다.** `pnpm verify`. 방식 파일의 「확인 방법」을 사용자가 할 일로 출력한다.

## 끝낼 때 출력

```text
켠 확장 / 만든 파일 / 검증 결과(실제 출력)

사람이 할 일
  《패키지 설치, 키 발급, 환경 변수 등록(.env.local 과 Vercel), 대시보드 설정, pnpm db:push》

브라우저·대시보드에서 확인할 것
  《방식 파일의 「확인 방법」》
```
