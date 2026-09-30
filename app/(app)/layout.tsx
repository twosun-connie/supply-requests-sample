import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { UserMenu } from "@/components/user-menu";
import { hasPermission, requireUser } from "@/lib/auth";
import { NAV_ITEMS, ROLE_LABEL } from "@/lib/navigation";
import { SITE_NAME } from "@/lib/site";

/**
 * 로그인한 사용자의 모든 화면을 감싼다: 왼쪽 사이드바, 위 띠, 본문, 아래 띠.
 * 메뉴는 권한 코드로 걸러 넘긴다. 로그인 확인은 각 페이지가 다시 한다.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const allowed = await Promise.all(
    NAV_ITEMS.map(
      async (item) =>
        item.permission === undefined || (await hasPermission(item.permission)),
    ),
  );
  const allowedHrefs = NAV_ITEMS.filter((_, index) => allowed[index]).map(
    (item) => item.href,
  );

  return (
    <SidebarProvider>
      <AppSidebar allowedHrefs={allowedHrefs} />
      <SidebarInset>
        <AppTopbar>
          <UserMenu email={user.email} roleLabel={ROLE_LABEL[user.role]} />
        </AppTopbar>
        {/* SidebarInset 이 <main> 이다. 여기서 <main> 을 또 만들지 않는다. */}
        <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
          {children}
        </div>
        <footer className="border-t px-4 py-3 text-xs text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} {SITE_NAME}
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
