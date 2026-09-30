"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, fail, OK } from "@/lib/action";
import { requireUser, hasPermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  checkCanApprove,
  checkNotOwnRequest,
  checkRejectReasonLength,
} from "./rules";
import { approveSchema, rejectSchema } from "./schema";

/**
 * 신청을 승인한다.
 * 순서: 로그인 → 권한 → 입력 검증 → 현재 상태 → 규칙 → 변경 → 이력 → 화면 갱신.
 */
export async function approveRequest(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  if (!(await hasPermission("requests.approve")))
    return fail("승인 권한이 없습니다.");

  const input = approveSchema.safeParse({
    id: formData.get("id"),
  });
  if (!input.success)
    return fail(input.error.issues[0]?.message ?? "입력을 확인해 주세요.");

  const supabase = await createClient();
  const current = await supabase
    .from("requests")
    .select("id, status, requester_id")
    .eq("id", input.data.id)
    .maybeSingle();

  if (current.error !== null) {
    console.error("신청을 읽지 못했다", { code: current.error.code });
    return fail("처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  }
  if (current.data === null) return fail("신청을 찾을 수 없습니다.");

  const checkApproveReason = checkCanApprove({ status: current.data.status });
  if (checkApproveReason !== null) return fail(checkApproveReason);

  const checkOwnReason = checkNotOwnRequest({
    requesterId: current.data.requester_id,
    actorId: actor.id,
  });
  if (checkOwnReason !== null) return fail(checkOwnReason);

  // 신청 승인
  const updated = await supabase
    .from("requests")
    .update({
      status: "approved",
      approver_id: actor.id,
    })
    .eq("id", input.data.id)
    .eq("status", current.data.status)
    .select("id");

  if (updated.error !== null) {
    console.error("신청을 승인하지 못했다", { code: updated.error.code });
    return fail("처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  }
  if (updated.data.length === 0)
    return fail("다른 사람이 먼저 처리했습니다. 새로 고침해 주세요.");

  // 이력 기록
  const eventInserted = await supabase
    .from("request_events")
    .insert({
      request_id: input.data.id,
      actor_id: actor.id,
      from_status: current.data.status,
      to_status: "approved",
    })
    .select("id");

  if (eventInserted.error !== null) {
    console.error("이력을 기록하지 못했다", {
      code: eventInserted.error.code,
    });
    return fail(
      "승인은 처리했지만 이력을 남기지 못했습니다. 관리자에게 알려 주세요.",
    );
  }

  revalidatePath(`/requests/${input.data.id}`);
  revalidatePath("/requests");
  return OK;
}

/**
 * 신청을 반려한다.
 * 순서: 로그인 → 권한 → 입력 검증 → 현재 상태 → 규칙 → 변경 → 이력 → 화면 갱신.
 */
export async function rejectRequest(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireUser();
  if (!(await hasPermission("requests.approve")))
    return fail("반려 권한이 없습니다.");

  const input = rejectSchema.safeParse({
    id: formData.get("id"),
    note: formData.get("note"),
  });
  if (!input.success)
    return fail(input.error.issues[0]?.message ?? "입력을 확인해 주세요.");

  const supabase = await createClient();
  const current = await supabase
    .from("requests")
    .select("id, status, requester_id")
    .eq("id", input.data.id)
    .maybeSingle();

  if (current.error !== null) {
    console.error("신청을 읽지 못했다", { code: current.error.code });
    return fail("처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  }
  if (current.data === null) return fail("신청을 찾을 수 없습니다.");

  const checkApproveReason = checkCanApprove({ status: current.data.status });
  if (checkApproveReason !== null) return fail(checkApproveReason);

  const checkOwnReason = checkNotOwnRequest({
    requesterId: current.data.requester_id,
    actorId: actor.id,
  });
  if (checkOwnReason !== null) return fail(checkOwnReason);

  const checkNoteReason = checkRejectReasonLength({ note: input.data.note });
  if (checkNoteReason !== null) return fail(checkNoteReason);

  // 신청 반려
  const updated = await supabase
    .from("requests")
    .update({
      status: "rejected",
      approver_id: actor.id,
      approver_note: input.data.note,
    })
    .eq("id", input.data.id)
    .eq("status", current.data.status)
    .select("id");

  if (updated.error !== null) {
    console.error("신청을 반려하지 못했다", { code: updated.error.code });
    return fail("처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  }
  if (updated.data.length === 0)
    return fail("다른 사람이 먼저 처리했습니다. 새로 고침해 주세요.");

  // 이력 기록
  const eventInserted = await supabase
    .from("request_events")
    .insert({
      request_id: input.data.id,
      actor_id: actor.id,
      from_status: current.data.status,
      to_status: "rejected",
      note: input.data.note,
    })
    .select("id");

  if (eventInserted.error !== null) {
    console.error("이력을 기록하지 못했다", {
      code: eventInserted.error.code,
    });
    return fail(
      "반려는 처리했지만 이력을 남기지 못했습니다. 관리자에게 알려 주세요.",
    );
  }

  revalidatePath(`/requests/${input.data.id}`);
  revalidatePath("/requests");
  return OK;
}
