# realtime — 실시간 갱신

표기: [문서] 공식 문서에서 확인, [판단] 이 템플릿에 맞춘 조합, [확인 필요] 쓰기 전에 공식 문서로 확인.

## 먼저 묻는다: 꼭 실시간이어야 하는가

목록이 몇 분 늦어도 되면 새로 고침이나 `revalidatePath`로 충분하다. 여러 사람이 같은 화면을 보며 바로 반응해야 할 때만 쓴다(처리 현황판, 알림).

## 방식 둘

| | Postgres Changes | Broadcast |
|---|---|---|
| 하는 일 | 테이블의 변경을 구독자에게 보낸다 | 채널에 메시지를 보낸다 |
| 권한 | 테이블의 `select` 정책 [문서] | `realtime.messages`의 정책 [문서] |
| 맞는 규모 | 작은 도구에 충분하다 | 구독자가 많을 때 [문서] |

작은 사내 도구는 Postgres Changes로 시작한다 [판단].

## 지킬 것

1. 구독 대상은 마이그레이션으로 더한다: `alter publication supabase_realtime add table public.《테이블》;`. 필요한 테이블만 [문서].
2. 그 테이블에 `select` 권한과 정책이 있어야 한다. 구독자는 읽을 수 있는 행의 변경만 받는다 [문서].
3. **지워진 행의 알림(`DELETE`)에는 정책이 적용되지 않는다** [문서]. 민감한 테이블은 `DELETE`를 구독하지 않고, `replica identity full`을 켜지 않는다 [판단].
4. 구독은 클라이언트 컴포넌트에서 하고 **반드시 정리한다**(`removeChannel`) [문서].
5. 받은 내용을 화면에 그대로 쓰지 않는다. 알림을 받으면 `router.refresh()`로 서버에서 다시 읽는다. 알림은 빠질 수 있고, 다시 읽으면 정책과 열 선택이 그대로 적용된다 [판단].
6. 필터로 필요한 행만 받는다(`filter: "org_id=eq.…"`). 변경 하나마다 구독자 수만큼 권한 확인이 돈다 [문서].
7. 권한은 연결하는 동안 유지된다. 역할을 빼도 토큰이 갱신될 때까지 계속 받는다 [문서].
8. Broadcast를 쓰면 비공개 채널(`config: { private: true }`)로 하고 `realtime.messages`에 정책을 쓴다. `alter table realtime.messages enable row level security`는 쓰지 않는다(이미 켜져 있고, 쓰면 적용이 실패한다) [문서].

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/** 신청이 바뀌면 서버에서 목록을 다시 읽게 한다. 화면에는 아무것도 그리지 않는다. */
export function RequestsLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("requests-changes")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "requests" }, () => router.refresh())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
```

## 하지 않는 것

- 정책 없는 테이블을 구독 대상에 더하기.
- 정리 없는 구독.
- 서버 컴포넌트에서 구독하기.
- 받은 내용으로 화면의 값을 확정하기.

## 확인 방법

- 대시보드 Database의 Publications에서 `supabase_realtime`에 의도한 테이블만 있다.
- 두 계정으로 열어, 권한 없는 쪽에는 알림이 오지 않는다.
- 브라우저 개발자 도구의 WS 탭에서 화면을 떠나면 채널이 닫힌다.
- 비공개 채널을 쓰면 대시보드 Realtime 설정의 공개 접근 허용을 끈다 [확인 필요: 설정 이름].

## 출처

- https://supabase.com/docs/guides/realtime/postgres-changes
- https://supabase.com/docs/guides/realtime/authorization
- https://supabase.com/docs/guides/realtime/broadcast
- https://supabase.com/docs/guides/realtime/limits
