// shadcn studio 의 무료 블록 login-page-01 을 바탕으로 했다(가운데 카드 + 배경 도형).
// 예제 내용(빠른 로그인 버튼, 매직 링크, 가입 링크, 구글 로그인)은 지웠다. 이 도구는 가입 화면이 없다.
import type { ReactNode } from "react";
import AuthBackgroundShape from "@/assets/svg/auth-background-shape";
import { AppLogo } from "@/components/app-logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** 로그인·비밀번호 정하기 화면의 틀. 가운데 카드 안에 폼(children)을 넣는다. */
export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-1 items-center justify-center overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
      <div className="absolute" aria-hidden>
        <AuthBackgroundShape />
      </div>
      <Card className="z-1 w-full gap-6 py-6 sm:max-w-md">
        <CardHeader className="gap-6 px-6">
          <AppLogo />
          <div>
            <CardTitle className="mb-1 text-2xl font-semibold">
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-6">
          {children}
          {footer !== undefined && (
            <p className="text-center text-sm text-muted-foreground">
              {footer}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
