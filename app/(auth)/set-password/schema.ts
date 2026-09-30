import { z } from "zod";

/** 비밀번호의 최소 조건. 대시보드(Authentication)의 비밀번호 설정과 같거나 더 엄격하게 둔다. */
export const MIN_PASSWORD_LENGTH = 10;

/** 비밀번호 정하기 폼의 입력. 두 칸이 같아야 통과한다. */
export const setPasswordSchema = z
  .object({
    password: z
      .string()
      .min(
        MIN_PASSWORD_LENGTH,
        `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상으로 정해 주세요.`,
      )
      .max(200),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    message: "두 비밀번호가 같지 않습니다.",
    path: ["confirm"],
  });
