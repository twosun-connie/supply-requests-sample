import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

const TYPES: readonly EmailOtpType[] = [
  "invite",
  "recovery",
  "email",
  "email_change",
  "signup",
  "magiclink",
];

/**
 * 초대·비밀번호 재설정 메일의 링크가 도착하는 곳. 메일 템플릿의 링크를
 * `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/set-password` 모양으로 바꿔 둔다.
 * Supabase 공식 예제는 next 를 확인하지 않고 redirect 한다. 그대로 쓰면 다른 사이트로 보내는 데 쓰일 수 있다.
 * 여기서는 safeRedirectPath() 로 내부 경로만 받는다.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = TYPES.find((value) => value === searchParams.get("type"));
  const next = safeRedirectPath(searchParams.get("next"));

  if (tokenHash === null || type === undefined) redirect("/login");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });
  if (error !== null) {
    console.error("확인 링크 검증 실패", { code: error.code });
    redirect("/login");
  }
  redirect(next);
}
