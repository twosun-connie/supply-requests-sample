"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { type ActionResult, fail } from "@/lib/action";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { checkItemSelectable } from "./rules";
import { createRequestSchema } from "./schema";

/**
 * 새 신청을 만든다. 신청은 누구나 만들 수 있어 별도 권한 코드가 없다(docs/permissions.md).
 * 순서: 로그인 확인 → 입력 검증 → 품목을 다시 읽어 업무 규칙 확인 → 생성 → 목록으로 이동.
 * 서버 액션은 누구나 부를 수 있는 공개 주소다. 그래서 폼이 사용 품목만 보여 주더라도 여기서 다시 확인한다.
 */
export async function createRequest(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();

  const input = createRequestSchema.safeParse({
    itemId: formData.get("itemId"),
    quantity: formData.get("quantity"),
    reason: formData.get("reason"),
    neededBy: formData.get("neededBy"),
  });
  if (!input.success)
    return fail(input.error.issues[0]?.message ?? "입력을 확인해 주세요.");

  const supabase = await createClient();
  const item = await supabase
    .from("items")
    .select("id, is_active")
    .eq("id", input.data.itemId)
    .maybeSingle();
  if (item.error !== null) {
    console.error("품목을 읽지 못했다", { code: item.error.code });
    return fail("처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  }
  const reason = checkItemSelectable(
    item.data === null ? null : { isActive: item.data.is_active },
  );
  if (reason !== null) return fail(reason);

  const inserted = await supabase
    .from("requests")
    .insert({
      requester_id: actor.id,
      item_id: input.data.itemId,
      quantity: input.data.quantity,
      reason: input.data.reason,
      needed_by: input.data.neededBy ?? null,
      status: "submitted",
    })
    .select("id");
  if (inserted.error !== null) {
    console.error("신청을 만들지 못했다", { code: inserted.error.code });
    return fail("신청하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  }
  // 정책이 막으면 오류 없이 0행이 돌아온다.
  if (inserted.data.length === 0)
    return fail("신청하지 못했습니다. 권한을 확인해 주세요.");

  revalidatePath("/requests");
  redirect("/requests");
}
