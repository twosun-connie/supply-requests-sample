import Link from "next/link";
import { logout } from "@/app/(auth)/login/actions";
import { NavLinks } from "@/components/nav-links";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/auth";
import { ROLE_LABEL, type NavItem } from "@/lib/navigation";
import { SITE_NAME } from "@/lib/site";

/** 상단 헤더. 서비스 이름, 메뉴, 사용자, 로그아웃. 서버 컴포넌트다. */
export function AppHeader({
  items,
  email,
  role,
}: {
  items: readonly NavItem[];
  email: string | null;
  role: Role;
}) {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-base font-bold tracking-tight">
          {SITE_NAME}
        </Link>
        <NavLinks items={items} />
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="hidden text-muted-foreground sm:inline">
            {email ?? ""}
          </span>
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {ROLE_LABEL[role]}
          </span>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              로그아웃
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
