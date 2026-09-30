---
name: add-block
description: shadcn studio 의 블록(로그인, 통계 카드, 대화 상자, 폼 배치, 빈 상태 등)을 골라 넣고 우리 화면에 맞게 고친다. 화면의 배치를 블록에서 가져오고 싶을 때, 사용자가 "studio 블록 써 줘", "admin kit 처럼"이라고 할 때 쓴다.
argument-hint: "[블록 이름 또는 화면 이름]"
---

# 블록 넣기: $ARGUMENTS

shadcn studio 는 코드를 복사해 넣는 방식이다. 넣은 뒤에는 이 저장소의 코드다. **블록은 배치만 가져온다.** 예제 내용은 모두 지운다.

1. **목록을 본다.** `docs/design.md`의 「쓰는 블록 목록」에 이 화면의 블록이 있는지 본다. 없으면 후보(이름, 무료·Pro, 딸려 오는 패키지)를 사용자에게 보여 주고 승인을 받아 목록에 먼저 적는다.
2. **앱 뼈대는 넣지 않는다.** 사이드바·위 띠·사용자 메뉴는 템플릿이 준다(`components/app-sidebar.tsx` 등). `application-shell-*`·`dashboard-shell-*`·`dashboard-sidebar-*`·`dashboard-header-*`는 구조만 참고한다. 뼈대가 둘이면 배치가 깨진다.
3. **딸려 오는 것을 먼저 본다.** 블록의 정의(`https://shadcnstudio.com/r/《components.json 의 style》/《이름》.json`)의 `dependencies`에 새 패키지(`@tanstack/react-table`, 차트 등)가 있으면 멈추고 사용자에게 묻는다(`AGENTS.md` §9).
4. **설치 명령을 제시한다.** 실행은 승인 뒤에 한다. 무료는 `@shadcn-studio`, Pro 는 `@ss-blocks`·`@ss-components`(레지스트리와 키는 템플릿 `README.md` §14).

```bash
pnpm dlx shadcn@latest add @shadcn-studio/《이름》
```

   - "이미 있는 파일을 덮어쓸까"를 물으면 **덮어쓰지 않는다**(n). `components/ui/`와 `lib/utils.ts`는 이 저장소의 것이 기준이다.
   - 질문에 답할 수 없는 곳(AI가 직접 실행할 때)에서는 질문에서 중단된다. `yes n | pnpm dlx shadcn@latest add @shadcn-studio/《이름》`으로 실행한다.
5. **딸려 온 예제를 지운다.** `app/《이름》/page.tsx`(예제 페이지), 쓰지 않는 `assets/svg/*`, 상표가 든 파일(`components/shadcn-studio/logo.tsx`, `assets/svg/logo.tsx`). 예제 페이지가 남으면 `pnpm check:app`이 막는다.
6. **우리 화면으로 고친다.** `components/shadcn-studio/blocks/《이름》`의 파일을:
   - 예제 내용(가짜 이름·숫자, 영어 문구, 외부 이미지 주소, 쓰지 않는 버튼·링크)을 지우고 `docs/screens.md`의 내용으로 채운다. 문구는 한국어 존댓말.
   - 색 값·색 이름 클래스(`bg-green-600`)를 뜻으로 된 클래스로 바꾼다(`pnpm check:app`이 막는다).
   - 값은 속성(props)으로 받게 하고 첫 줄에 어느 블록에서 왔는지 주석을 단다.
   - 로그인·가입 블록의 소셜 로그인·가입 링크는 지운다(가입 화면을 만들지 않는다).
7. **검증한다.** `pnpm verify`. 375px 폭, Tab 이동.
8. **기록한다.** 작업 기록의 「결정」에 고른 블록과 버린 후보, `docs/design.md`의 목록에 넣은 날.

## 자주 쓰는 무료 블록 (2026-09-30 확인, 스타일 `base-nova`)

| 쓰임 | 블록 | 딸려 오는 패키지 |
|---|---|---|
| 로그인 틀(가운데 카드 + 배경) | `login-page-01` | 없음 |
| 통계 카드 | `statistics-component-01`, `statistics-component-12` | 없음 |
| 빈 상태 | `empty-state-01` | 없음 |
| 확인·입력 대화 상자 | `dashboard-dialog-01`, `-02`, `-21`, `-22` | 확인 필요 |
| 폼 배치 | `form-layout-01`, `-02` | 확인 필요 |
| 계정 설정 | `account-settings-01` | 확인 필요 |
| 위젯 카드 | `widget-component-01`, `-02` | 확인 필요 |
| 표·배지·쪽 번호 등 변형 | 컴포넌트 `table-*`, `badge-*`, `pagination-*` | 없음. `data-table-*`는 `@tanstack/react-table` |
| 참고만(넣지 않는다) | `application-shell-01`, `dashboard-shell-01` | `dashboard-shell-01`은 표·차트 패키지 |

## 끝낼 때 출력

- 넣은 블록과 지운 예제, 바꾼 파일
- 새로 딸려 온 `components/ui/` 파일
- 사람이 할 일: 브라우저에서 볼 화면
