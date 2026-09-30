# email — 알림 메일

표기: [문서] 공식 문서에서 확인, [판단] 이 템플릿에 맞춘 조합, [확인 필요] 쓰기 전에 공식 문서로 확인.

## 먼저 구분한다

| 메일 | 보내는 곳 | 설정 |
|---|---|---|
| 로그인·초대·비밀번호 재설정 | Supabase Auth | 대시보드 Authentication의 SMTP 설정 |
| 업무 알림(승인 요청 등) | 앱의 서버 코드 | 이 방식 파일 |

Supabase의 기본 메일은 프로젝트 팀 구성원에게만, 시간당 몇 통만 보낸다. 운영용이 아니다 [문서]. 실제 사용자를 초대하려면 Auth에도 SMTP를 설정한다.

## 필요한 것

- 패키지: `pnpm add resend` [문서].
- 환경 변수: `RESEND_API_KEY`. `.env.local`과 Vercel(Sensitive)에 사용자가 넣는다.
- Resend 대시보드: 보내는 도메인 인증, 보내기만 되는 권한의 키 [확인 필요: 권한 이름].

## 지킬 것

1. 보내는 코드는 서버 전용 파일 하나에 둔다(`lib/mail.ts`, 첫 줄 `import "server-only"`).
2. 받는 사람과 본문은 서버가 DB에서 읽어 만든다. 브라우저가 보낸 주소·본문을 그대로 쓰지 않는다 [판단].
3. **업무 변경이 먼저, 메일은 그다음이다.** 메일이 실패해도 업무 변경을 되돌리지 않는다. 실패를 기록하고 화면에는 "처리했습니다. 알림 메일은 보내지 못했습니다."라고 알린다 [판단].
4. 응답을 늦추지 않으려면 `after()` 안에서 보낸다 [확인 필요: 설치된 Next.js 문서].
5. 반환 값의 `error`를 확인한다 [문서].
6. 같은 메일이 두 번 나가지 않게 멱등 키를 쓴다(`《종류》/《업무 행의 ID》`) [확인 필요: 옵션 이름과 보관 시간].
7. 받는 사람의 주소를 로그에 남기지 않는다.

```ts
import "server-only";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/** 승인 요청 메일을 보낸다. 실패하면 false. 업무 처리를 되돌리지 않는다. */
export async function sendApprovalRequest(to: string, requestId: number): Promise<boolean> {
  const { error } = await resend.emails.send(
    { from: "《도구 이름》 <notify@《인증한 도메인》>", to: [to], subject: "승인 요청이 있습니다", html: "<p>…</p>" },
    { idempotencyKey: `approval-request/${requestId}` },
  );
  if (error !== null) console.error("메일 발송 실패", { name: error.name, requestId });
  return error === null;
}
```

## 하지 않는 것

- 키 이름에 `NEXT_PUBLIC_`을 붙이기.
- 시험용 보내는 주소(`onboarding@resend.dev`)로 운영하기.
- 모든 권한의 키를 앱에 넣기.
- SMTP로 보내기(Vercel은 25번 포트를 막는다. HTTP API를 쓴다) [확인 필요].

## 확인 방법

- Resend 대시보드: 도메인이 인증됐고 발송 기록이 있다.
- 브라우저의 네트워크 탭과 페이지 소스에 키가 없다.
- 같은 동작을 두 번 해도 메일은 한 통이다.
- 메일 키를 틀린 값으로 바꾸고 동작하면 업무 처리는 되고 화면에 알림이 나온다.

## 출처

- https://resend.com/docs/send-with-nextjs
- https://resend.com/docs/dashboard/emails/idempotency-keys
- https://supabase.com/docs/guides/auth/auth-smtp
- https://vercel.com/docs/environment-variables/sensitive-environment-variables
