# scheduled-jobs — 예약 작업

표기: [문서] 공식 문서에서 확인, [판단] 이 템플릿에 맞춘 조합, [확인 필요] 쓰기 전에 공식 문서로 확인.

## 어느 쪽을 쓰는가

| | Supabase Cron(pg_cron) | Vercel Cron Jobs |
|---|---|---|
| 하는 일 | SQL, DB 함수 | 앱의 Route Handler를 HTTP GET으로 부른다 |
| 맞는 일 | DB 안에서 끝나는 일(기한 지난 행의 상태 바꾸기, 오래된 행 정리) | 앱 코드·외부 API가 필요한 일(메일 보내기) |
| 최소 간격 | 짧다 | 요금제에 따라 다르다. Hobby는 하루 한 번 [문서] |
| 시간대 | GMT | UTC |
| 실패하면 | `cron.job_run_details`에 기록 | 다시 시도하지 않는다 [문서] |

DB 안에서 끝나면 Supabase Cron을 쓴다. 키가 필요 없다 [판단].

## 지킬 것 (공통)

1. **두 번 돌아도 안전하게 만든다.** 같은 예약이 두 번 실행되거나 빠질 수 있다 [문서]. "10을 더한다"가 아니라 "기한이 지난 것을 만료로 바꾼다".
2. 시각은 UTC로 쓴다. 한국 시간 09:00은 `0 0 * * *`이다.
3. 한 번에 처리하는 양에 한도를 둔다(`limit`).
4. 실행 시간이 간격보다 길어지면 겹친다. 간격을 넓히거나 잠금을 쓴다 [문서].

## 지킬 것 (Vercel Cron)

1. 경로는 `app/api/cron/《이름》/route.ts`, 예약은 `vercel.json`의 `crons`.
2. 첫 줄에서 `CRON_SECRET`을 확인한다. Vercel이 `Authorization: Bearer 《값》`으로 보낸다 [문서]. 값은 사용자가 Vercel에 넣는다(무작위 16자 이상).
3. 이 경로는 로그인한 사용자가 없다. 그래서 `lib/supabase/server.ts`의 클라이언트로는 로그인하지 않은 요청이 되어 정책에 막힌다. DB를 바꿔야 하면 그 일을 DB 함수로 만들어 Supabase Cron으로 돌리거나, `admin-api` 확장을 켠다 [판단].
4. `lib/supabase/proxy.ts`의 `PUBLIC_PATHS`에 `/api/cron`을 더한다. 더하지 않으면 로그인 화면으로 보내진다.

```ts
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (secret === undefined || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  // 두 번 실행돼도 결과가 같은 일만 한다.
  return Response.json({ ok: true });
}
```

## 지킬 것 (Supabase Cron)

1. 확장 켜기와 예약 등록은 마이그레이션으로 한다 [확인 필요: 확장을 켜는 SQL].
2. 작업 이름은 고칠 수 없다. 같은 이름으로 다시 등록하면 덮어쓴다 [문서].
3. 실행 기록(`cron.job_run_details`)은 저절로 지워지지 않는다. 정리하는 예약을 함께 등록한다 [문서].
4. SQL 안에 키를 적지 않는다.

```sql
select cron.schedule('expire-requests', '0 15 * * *',  -- 한국 시간 00:00
  $$ update public.requests set status = 'expired' where status = 'submitted' and due_at < now() $$);
select cron.schedule('cron-history-cleanup', '0 16 * * *',
  $$ delete from cron.job_run_details where end_time < now() - interval '7 days' $$);
```

DB 테스트의 흉내 환경은 `cron.schedule()`로 예약을 등록만 하고 실행하지 않는다. 예약이 하는 일을 확인하려면 그 SQL을 DB 함수로 만들어 함수를 테스트한다(`db-functions` 확장) [판단].

## 하지 않는 것

- `CRON_SECRET` 확인 없는 경로.
- 요청 헤더의 `user-agent`만 보고 믿기.
- 한국 시간으로 착각하고 예약 시각을 쓰기.

## 확인 방법

- 헤더 없이 경로를 열면 401이다.
- Vercel의 Cron Jobs 또는 Supabase의 Cron 기록에 성공이 보인다.
- 같은 작업을 두 번 연달아 돌려도 결과가 같다.

## 출처

- https://vercel.com/docs/cron-jobs
- https://vercel.com/docs/cron-jobs/manage-cron-jobs
- https://vercel.com/docs/cron-jobs/usage-and-pricing
- https://supabase.com/docs/guides/cron
- https://supabase.com/docs/guides/cron/quickstart
