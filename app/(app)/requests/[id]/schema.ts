import { z } from "zod";

export const approveSchema = z.object({
  id: z.coerce.number().int().positive("신청을 찾을 수 없습니다."),
});

export const rejectSchema = z.object({
  id: z.coerce.number().int().positive("신청을 찾을 수 없습니다."),
  note: z
    .string()
    .min(1, "반려 사유를 입력해 주세요.")
    .max(200, "반려 사유는 200자 이하여야 합니다."),
});
