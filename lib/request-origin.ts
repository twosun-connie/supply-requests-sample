/**
 * Route Handler 가 받은 요청이 이 사이트에서 온 것인지 본다.
 * 서버 액션은 Next.js 가 출처를 확인하지만 route.ts 는 확인하지 않는다.
 * 상태를 바꾸는 route.ts(POST·PUT·PATCH·DELETE)는 첫 줄에서 이 함수를 부른다.
 * 외부 서비스가 부르는 주소(웹훅, 예약 작업)는 이 함수 대신 서명이나 비밀 값을 확인한다.
 *
 * @param request 받은 요청
 * @returns 같은 출처면 true. 출처를 알 수 없으면 false(안전한 쪽으로 실패)
 */
export function isSameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site !== null) return site === "same-origin";

  const origin = request.headers.get("origin");
  if (origin === null) return false;
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return host !== null && new URL(origin).host === host;
  } catch {
    return false;
  }
}
