import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { LoginForm } from "./login-form";

/** 로그인 화면. 가입 화면은 없다. 사용자는 관리자가 초대한다. */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeRedirectPath((await searchParams).next);
  if ((await getUser()) !== null) redirect(next);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 p-4">
      <h1 className="text-xl font-semibold">로그인</h1>
      <LoginForm next={next} />
      <p className="text-sm text-muted-foreground">
        계정이 없으면 관리자에게 초대를 요청해 주세요.
      </p>
    </main>
  );
}
