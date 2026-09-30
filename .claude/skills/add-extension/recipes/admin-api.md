# admin-api — secret 키를 쓰는 관리자 기능

표기: [문서] 공식 문서에서 확인, [판단] 이 템플릿에 맞춘 조합, [실측] 이 템플릿의 검사로 확인.

## 무엇이 달라지는가

secret 키(`sb_secret_…`)는 **모든 정책을 우회한다**. 이 키로 만든 클라이언트는 어느 행이든 읽고 바꾼다 [문서]. 그래서 이 확장을 켜면 "DB가 최종으로 막는다"는 전제가 관리자 기능에서는 성립하지 않는다. 서버 액션의 권한 확인이 유일한 방어선이 된다.

쓰는 경우: 앱 안에서 사용자 초대(`auth.admin.inviteUserByEmail`), 사용자 목록(`auth.admin.listUsers`), 사용자 없는 예약 작업. 대시보드에서 해도 되는 일이면 켜지 않는다.

## 필요한 것

- 환경 변수: `SUPABASE_SECRET_KEY`. 사용자가 `.env.local`과 Vercel(Sensitive)에 넣는다. `NEXT_PUBLIC_`을 붙이지 않는다 [문서].
- 대시보드: Settings의 API Keys에서 secret 키 발급. 초대 메일을 쓰면 Authentication의 URL 설정과 SMTP(`email` 방식 파일).
- 마이그레이션: secret 키로 `public`의 테이블을 읽거나 바꾸려면 `service_role`에도 권한이 필요하다. `grant select, insert, update on table public.《테이블》 to service_role;` [문서]

## 지킬 것

1. 관리자 클라이언트는 `lib/supabase/admin.ts` **한 파일에만** 만든다. 첫 줄은 `import "server-only"`. 훅·ESLint·확장 검사가 다른 파일의 secret 키 사용을 막는다 [실측].
2. 부르기 전에 **사용자의 세션으로** 로그인과 권한을 확인한다: `requireUser()` → `hasPermission('users.manage')`.
3. 관리자 클라이언트로 하는 일을 좁힌다. 일반 조회·변경은 계속 `lib/supabase/server.ts`의 클라이언트로 한다(정책이 적용된다).
4. 사용자가 보낸 값으로 대상을 고르지 않는다. 대상의 ID를 검증하고(`z.uuid()`), 자기 자신에 대한 동작은 `rules.ts`로 따로 검사한다.
5. 돌려주는 값은 화면에 필요한 것만. 사용자 객체 전체를 돌려주지 않는다.
6. 누가 누구에게 무엇을 했는지 기록한다(테이블 하나, `actor_id`, `target_id`, `action`, `created_at`) [판단].
7. 키를 로그에 남기지 않는다. 노출됐으면 새 키를 발급하고 옛 키를 지운다 [문서].

```ts
// lib/supabase/admin.ts
import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/** 정책을 우회하는 클라이언트. 부르기 전에 hasPermission() 으로 권한을 확인한다. */
export function createAdminClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}
```

```ts
// actions.ts
export async function inviteUser(_previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireUser();
  if (!(await hasPermission("users.manage"))) return DENIED;
  const input = inviteSchema.safeParse({ email: formData.get("email") });
  if (!input.success) return fail("이메일을 확인해 주세요.");

  const { error } = await createAdminClient().auth.admin.inviteUserByEmail(input.data.email);
  if (error !== null) return fail("초대하지 못했습니다. 이미 가입한 주소인지 확인해 주세요.");
  return OK;
}
```

## 하지 않는 것

- 권한 확인 없이 관리자 클라이언트를 부르기.
- 관리자 클라이언트를 쿠키를 읽는 클라이언트(`createServerClient`)로 만들기. 사용자 토큰이 실리면 그 사용자의 권한으로 돈다 [문서].
- 편하다는 이유로 일반 조회에 관리자 클라이언트를 쓰기.
- `user_metadata`에 역할을 넣고 그것으로 판단하기.

## 확인 방법

- `pnpm build` 뒤 `.next/static`에서 `sb_secret_`을 찾으면 0건이다.
- 일반 사용자 계정으로 관리자 화면을 열면 404, 서버 액션은 "권한이 없습니다."를 돌려준다.
- 초대 메일이 도착하고 링크로 가입이 끝난다.

## 출처

- https://supabase.com/docs/guides/api/api-keys
- https://supabase.com/docs/guides/troubleshooting/performing-administration-tasks-on-the-server-side-with-the-servicerole-secret-BYM4Fa
- https://supabase.com/docs/guides/api/securing-your-api
- https://nextjs.org/docs/app/guides/data-security
