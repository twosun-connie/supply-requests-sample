import { AuthCard } from "@/components/shadcn-studio/blocks/login-page-01/login-page-01";
import { requireUser } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH } from "./schema";
import { SetPasswordForm } from "./set-password-form";

export const metadata = { title: "비밀번호 정하기" };

/** 비밀번호를 정하는 화면. 초대·재설정 링크(/auth/confirm)를 거쳐 들어온다. */
export default async function SetPasswordPage() {
  await requireUser();

  return (
    <AuthCard
      title="비밀번호 정하기"
      description="이 계정에서 쓸 새 비밀번호를 정해 주세요."
    >
      <SetPasswordForm minLength={MIN_PASSWORD_LENGTH} />
    </AuthCard>
  );
}
