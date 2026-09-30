import { z } from "zod";

/** 새 신청 폼의 입력. 서버 액션이 이 스키마로 검증한다. */
export const createRequestSchema = z.object({
  itemId: z.coerce
    .number("품목을 선택해 주세요.")
    .int()
    .positive("품목을 선택해 주세요."),
  quantity: z.coerce
    .number("수량을 입력해 주세요.")
    .int("수량은 1~999개입니다.")
    .min(1, "수량은 1~999개입니다.")
    .max(999, "수량은 1~999개입니다."),
  reason: z
    .string("사유를 입력해 주세요.")
    .trim()
    .min(1, "사유를 입력해 주세요.")
    .max(200, "사유는 200자 이하입니다."),
  // 빈 문자열(입력하지 않음)은 없는 값으로 본다. 희망 지급일은 시스템이 강제하지 않는다.
  neededBy: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.iso.date("희망 지급일을 다시 확인해 주세요.").optional(),
  ),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
