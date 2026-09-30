import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getUser } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
import { LoginForm } from "./login-form";

export const metadata = { title: "로그인" };

/** 로그인 화면. 가입 화면은 없다. 사용자는 관리자가 초대한다. */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeRedirectPath((await searchParams).next);
  if ((await getUser()) !== null) redirect(next);

  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 p-4">
      <div className="flex w-full max-w-sm flex-col gap-4">
        <div className="text-center">
          <p className="text-lg font-bold tracking-tight">{SITE_NAME}</p>
          {SITE_DESCRIPTION !== "" && (
            <p className="text-sm text-muted-foreground">{SITE_DESCRIPTION}</p>
          )}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>로그인</CardTitle>
            <CardDescription>
              회사 이메일과 비밀번호를 입력해 주세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm next={next} />
          </CardContent>
        </Card>
        <p className="text-center text-sm text-muted-foreground">
          계정이 없으면 관리자에게 초대를 요청해 주세요.
        </p>
      </div>
    </main>
  );
}
