---
paths:
  - "app/**/*.ts"
  - "app/**/*.tsx"
  - "features/**"
  - "lib/**"
  - "proxy.ts"
---

# 데이터 접근 규칙 (조회, 서버 액션, 로그인·권한)

## 1. 클라이언트 고르기

| 곳 | 쓰는 것 | 하는 일 |
|---|---|---|
| 서버 컴포넌트, 서버 액션, Route Handler | `lib/supabase/server.ts`의 `createClient()` | 조회와 변경. 요청마다 새로 만든다. 모듈 전역 변수에 담지 않는다 |
| 클라이언트 컴포넌트 | `lib/supabase/client.ts`의 `createClient()` | 로그인·로그아웃, 실시간 구독(`realtime` 확장)만. **DB를 읽거나 바꾸지 않는다** |
| 루트 `proxy.ts` | `lib/supabase/proxy.ts`의 `updateSession()` | 세션 갱신과 로그인하지 않은 요청 돌려보내기 |
| 관리자 기능(`admin-api` 확장) | `lib/supabase/admin.ts`의 `createAdminClient()` | secret 키. 모든 정책을 우회한다. 부르기 전에 `hasPermission()` |

- `lib/supabase/` 밖에서 `createClient`·`createServerClient`·`createBrowserClient`를 직접 부르지 않는다. ESLint가 막는다.
- 로그인 없이 열 수 있는 경로는 `lib/supabase/proxy.ts`의 `PUBLIC_PATHS`에만 더한다.

## 2. 로그인과 권한 확인

`lib/auth.ts`만 쓴다.

| 함수 | 쓰는 곳 | 없을 때 |
|---|---|---|
| `requireUser()` | 서버 액션과 페이지의 첫 줄 | `/login`으로 보낸다 |
| `requirePermission('대상.동작')` | 권한이 필요한 페이지·레이아웃 | 404를 보여 준다(있는지도 알리지 않는다) |
| `hasPermission('대상.동작')` | 서버 액션, 버튼·메뉴를 숨길 때 | `false` |
| `getUser()` | 로그인 여부에 따라 화면이 달라질 때 | `null` |

- `proxy.ts`가 로그인을 확인하더라도 페이지와 서버 액션에서 **다시 확인한다**. 서버 액션은 주소를 알면 직접 부를 수 있다.
- 페이지는 **조회보다 먼저** `requireUser()`나 `requirePermission()`을 부른다. `getUser()`로 받아 `null`을 검사하는 것으로 대신하지 않는다. `pnpm check:app`이 확인한다.
- 화면에서 버튼을 숨기는 것은 편의다. 같은 권한을 서버 액션에서 확인하고, DB의 정책이 최종으로 막는다.
- 권한 코드의 타입은 `Permission`(DB의 enum)이다. 없는 코드를 쓰면 타입 검사가 실패한다.
- `getClaims()`는 토큰을 검증한다. 대칭 키를 쓰는 옛 프로젝트에서는 매번 Auth 서버를 부른다. `lib/auth.ts`가 요청 하나에 한 번만 부르게 한다.

## 3. 조회 (`queries.ts`)

- 첫 줄에 `import "server-only";`. 클라이언트 컴포넌트에서 불러오면 빌드가 실패한다.
- 화면에 필요한 열만 고르고, DB의 이름(`full_name`)을 화면의 이름(`fullName`)으로 바꿔 돌려준다. DB 행을 그대로 넘기지 않는다.
- 목록은 `.range()`로 쪽을 나누고 `.order()`를 적는다. 기본 20행, 최신순.
- 연관 데이터는 `.in()`으로 한 번에 읽는다. 반복문 안에서 조회하지 않는다.
- 어느 행이 보이는지는 정책이 정한다. 그래도 조건(`.eq('requester_id', user.id)`)을 적는다. 인덱스를 타고, 정책이 빠졌을 때의 두 번째 방어선이 된다.
- 읽지 못하면 예외를 던진다. `error.tsx`가 받는다. 빈 배열로 바꿔 숨기지 않는다.
- DB의 타입을 손으로 다시 적지 않는다. enum은 `Database["public"]["Enums"]["request_status"]`, 행은 `Database["public"]["Tables"]["requests"]["Row"]`에서 가져온다. `"submitted" | "approved"`처럼 직접 적으면 DB가 바뀌어도 타입 검사가 모른다.
- `as`로 타입을 단언하지 않는다(ESLint가 막는다). 주소의 `?status=`처럼 밖에서 온 값은 Zod로 검증해 좁힌다: `z.enum(Constants.public.Enums.request_status).safeParse(value)`.

## 4. 서버 액션 (`actions.ts`)

```ts
export async function approveRequest(_previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const actor = await requireUser();                                    // 1. 로그인
  if (!(await hasPermission("requests.approve"))) return DENIED;        // 2. 권한
  const input = approveSchema.safeParse({ id: formData.get("id") });    // 3. 입력
  if (!input.success) return fail(input.error.issues[0]?.message ?? "입력을 확인해 주세요.");

  const supabase = await createClient();
  const current = await supabase.from("requests").select("id, status").eq("id", input.data.id).maybeSingle();
  if (current.error !== null || current.data === null) return fail("신청을 찾을 수 없습니다.");  // 4. 현재 상태
  const reason = checkApprove(current.data.status);                     // 5. 규칙(rules.ts)
  if (reason !== null) return fail(reason);

  const changed = await supabase.from("requests")
    .update({ status: "approved", approver_id: actor.id })
    .eq("id", input.data.id).eq("status", current.data.status)          // 6. 그 사이 바뀌었으면 0행
    .select("id");
  if (changed.error !== null) return fail("처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  if (changed.data.length === 0) return fail("다른 사람이 먼저 처리했습니다. 새로 고침해 주세요.");
  revalidatePath("/requests");                                          // 7. 화면 갱신
  return OK;
}
```

- 폼이 보낸 상태 값을 믿지 않는다. 현재 상태는 DB에서 다시 읽는다.
- 변경에는 바꾸기 전의 조건(`.eq("status", …)`)을 붙인다. 두 사람이 동시에 눌러도 한 번만 적용된다.
- 변경 뒤에는 `.select("id")`로 바뀐 행을 받는다. 정책이 막으면 오류 없이 0행이 온다.
- 사용자·조직의 ID를 폼에서 받지 않는다. `requireUser()`가 돌려준 값을 쓴다.
- **여러 테이블을 함께 바꿀 때(신청 + 이력).** 서버 액션의 두 번의 호출은 한 묶음이 아니다. 첫째가 되고 둘째가 실패할 수 있다.
  - 문서의 규칙이 둘 다를 요구하면(예: "상태를 바꾸면 이력을 한 줄 남긴다") DB 함수 하나로 묶는 것이 맞다. 계획에서 `db-functions` 확장을 제안한다.
  - 확장을 켜지 않고 나눠 쓰기로 했으면: 핵심 변경을 먼저 한다. 둘째가 실패하면 기록하고 **성공으로 돌려주지 않는다**. `fail("승인은 처리했지만 이력을 남기지 못했습니다. 관리자에게 알려 주세요.")`처럼 무엇이 되고 무엇이 안 됐는지 알린다.
  - 어느 쪽을 택했는지 보고의 「남은 위험」에 적는다.
- 반환 값은 `ActionResult`뿐이다. 화면은 `revalidatePath` 뒤에 다시 조회한 값을 본다.
- 액션 전체를 `try/catch`로 감싸지 않는다. `requireUser()`와 `redirect()`는 예외로 화면을 옮기는데 `catch`가 삼킨다. Supabase 호출은 예외를 던지지 않으니 `error` 값을 검사한다.
- 서버 액션에서는 `requirePermission()`이 아니라 `requireUser()` + `hasPermission()`을 쓴다. `requirePermission()`은 권한이 없으면 404 화면을 띄우는 페이지용이다.
- 위의 것(상태 조건, 바뀐 행 확인, `try` 감싸기, 화면 갱신)은 `pnpm check:app`이 확인한다.

## 5. 업무 규칙 (`rules.ts`)

- 순수 함수만 둔다. DB·쿠키·요청·현재 시각을 직접 읽지 않고 인자로 받는다.
- 인자가 둘 이상이면 **이름 붙은 객체**로 받는다: `checkApprove({ status, requesterId, actorId })`. 문자열 여러 개를 순서대로 받으면 ID 자리에 이메일을 넣어도 타입 검사가 통과한다.
- 액션이 규칙 함수에 넘기는 값은 DB에서 읽은 행의 열 그대로다(`current.data.requester_id`). 화면용으로 바꾼 값(이름, 이메일)을 넘기지 않는다.
- 안 되면 사용자에게 보여 줄 문장을, 되면 `null`을 돌려준다.
- 규칙 문장 하나에 테스트 하나. 테스트 이름은 `docs/rules.md`의 문장을 그대로 쓴다.
- 길이·범위·필수처럼 **입력 검증으로 강제하는 규칙**은 `schema.ts`에 두고 `schema.test.ts`로 확인한다(경계 값: 0과 1, 200자와 201자, 빈 값).
- 규칙이 없으면 `rules.ts`를 만들지 않는다. 주석만 있는 파일을 두지 않는다.
- `rules.ts`는 `next/*`, `lib/auth`, `lib/supabase`의 클라이언트를 불러오지 않는다. DB의 타입은 `import type`으로 가져온다.
- 문서와 다르게 고치지 않는다. 규칙이 바뀌면 문서를 먼저 고친다.

## 6. 오류와 로그

- 사용자에게는 무엇을 하면 되는지 말한다. DB의 오류 메시지·테이블 이름·스택을 보여 주지 않는다.
- 서버 로그는 `console.error("무엇이 실패했다", { code: error.code })`. 비밀번호·토큰·이메일·주민번호 같은 개인정보를 넣지 않는다. `console.log`는 쓰지 않는다.
- `catch`에서 삼키지 않는다. 기록하고 `fail()`을 돌려주거나 다시 던진다.

## 7. 값의 형식

- 시각은 DB에 `timestamptz`로 두고 화면에서 한국 시간으로 보여 준다(`YYYY-MM-DD`, 필요하면 `HH:mm`).
- 돈은 원 단위 정수다. 화면에서 `toLocaleString("ko-KR")`로 쉼표를 넣는다. 소수 계산을 하지 않는다.
- 환경 변수는 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 둘이다. 더할 때는 `.env.example`에 이름만 적고 사용자에게 값을 넣어 달라고 한다.
