import { z } from "zod";
import { Constants } from "@/lib/supabase/database.types";

/** 역할 변경 폼의 입력. 서버 액션이 이 스키마로 검증한다. */
export const changeRoleSchema = z.object({
  userId: z.uuid("사용자를 다시 선택해 주세요."),
  role: z.enum(Constants.public.Enums.app_role, "역할을 다시 선택해 주세요."),
});

export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;
