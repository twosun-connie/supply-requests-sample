"use server";

import { redirect } from "next/navigation";
import { type ActionResult, fail } from "@/lib/action";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "./schema";

/** 계정이 있는지, 무엇이 틀렸는지 드러내지 않는다. 실패 문구는 이것 하나다. */
const LOGIN_FAILED = "이메일 또는 비밀번호가 맞지 않습니다.";

/**
 * 이메일과 비밀번호로 로그인한다.
 * 시도 제한과 비밀번호 검증은 Supabase Auth 가 한다. 여기서는 문구를 하나로 하고 돌아갈 곳을 확인한다.
 */
export async function login(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const input = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!input.success) return fail(LOGIN_FAILED);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(input.data);
  if (error !== null) {
    console.error("로그인 실패", { code: error.code });
    return fail(LOGIN_FAILED);
  }

  redirect(safeRedirectPath(formData.get("next")));
}

/** 로그아웃한다. */
export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
