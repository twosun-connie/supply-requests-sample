import { requireUser } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH } from "./schema";
import { SetPasswordForm } from "./set-password-form";

/** 비밀번호를 정하는 화면. 초대·재설정 링크(/auth/confirm)를 거쳐 들어온다. */
export default async function SetPasswordPage() {
  await requireUser();

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 p-4">
      <h1 className="text-xl font-semibold">비밀번호 정하기</h1>
      <SetPasswordForm minLength={MIN_PASSWORD_LENGTH} />
    </main>
  );
}
