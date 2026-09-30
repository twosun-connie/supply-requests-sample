import { redirect } from "next/navigation";
import { AuthCard } from "@/components/shadcn-studio/blocks/login-page-01/login-page-01";
import { getUser } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { SITE_DESCRIPTION } from "@/lib/site";
import { LoginForm } from "./login-form";

export const metadata = { title: "로그인" };

/** 로그인 화면. 가입 화면은 없다. 사용자는 관리자가 초대한다. */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeRedirectPath((await searchParams).next);
  if ((await getUser()) !== null) redirect(next);

  return (
    <AuthCard
      title="로그인"
      description={
        SITE_DESCRIPTION === ""
          ? "회사 이메일과 비밀번호를 입력해 주세요."
          : SITE_DESCRIPTION
      }
      footer="계정이 없으면 관리자에게 초대를 요청해 주세요."
    >
      <LoginForm next={next} />
    </AuthCard>
  );
}
