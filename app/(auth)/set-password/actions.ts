"use server";

import { redirect } from "next/navigation";
import { type ActionResult, fail } from "@/lib/action";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { setPasswordSchema } from "./schema";

/** 초대를 받았거나 재설정 링크로 들어온 사용자가 비밀번호를 정한다. 링크를 거쳐 로그인된 상태여야 한다. */
export async function setPassword(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();

  const input = setPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!input.success)
    return fail(input.error.issues[0]?.message ?? "입력을 확인해 주세요.");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: input.data.password,
  });
  if (error !== null) {
    console.error("비밀번호 설정 실패", { code: error.code });
    return fail(
      "비밀번호를 정하지 못했습니다. 더 길거나 흔하지 않은 비밀번호로 다시 시도해 주세요.",
    );
  }
  redirect("/");
}
