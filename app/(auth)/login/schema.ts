import { z } from "zod";

/** 로그인 폼의 입력. 비밀번호의 길이·문자 규칙은 여기서 보지 않는다(어떤 값이 틀렸는지 알려 주지 않는다). */
export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(200),
});
