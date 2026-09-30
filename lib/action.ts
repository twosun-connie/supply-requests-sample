/** 서버 액션의 반환 형태. 화면에 필요한 최소한만 돌려준다. DB 행이나 오류 객체를 그대로 넘기지 않는다. */
export type ActionResult = { ok: true } | { ok: false; message: string };

export const OK: ActionResult = { ok: true };

/** 권한이 없을 때의 응답. RLS 는 권한이 없으면 오류 없이 0행을 돌려주므로, 이 응답은 서버 액션이 만든다. */
export const DENIED: ActionResult = { ok: false, message: "권한이 없습니다." };

/** 실패 응답을 만든다. message 는 사용자에게 보이는 문장이다. DB 오류 메시지를 넣지 않는다. */
export function fail(message: string): ActionResult {
  return { ok: false, message };
}
