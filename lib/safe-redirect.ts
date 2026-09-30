/** 로그인 뒤에 돌아갈 곳이 없을 때 가는 경로. */
const FALLBACK = "/";

/**
 * 밖에서 온 값(주소의 ?next= 등)을 이 사이트 안의 경로로만 바꾼다.
 * 다른 사이트의 주소, 프로토콜이 붙은 주소, `//` 로 시작하는 주소는 받지 않는다.
 * 로그인·확인 링크처럼 밖에서 온 값으로 화면을 옮길 때는 반드시 이 함수를 거친다.
 *
 * @param value 밖에서 온 값. 문자열이 아니면 기본 경로를 돌려준다
 * @returns `/` 로 시작하는 내부 경로
 */
export function safeRedirectPath(value: unknown): string {
  if (typeof value !== "string") return FALLBACK;
  // 제어 문자·역슬래시는 브라우저마다 다르게 해석된다. 들어 있으면 받지 않는다.
  if (!/^\/[^\s\\]*$/.test(value) || value.startsWith("//")) return FALLBACK;
  try {
    const base = "https://internal.invalid";
    const url = new URL(value, base);
    if (url.origin !== base) return FALLBACK;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return FALLBACK;
  }
}
