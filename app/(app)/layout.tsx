import { AppHeader } from "@/components/app-header";
import { hasPermission, requireUser } from "@/lib/auth";
import { NAV_ITEMS } from "@/lib/navigation";

/** 로그인한 사용자의 모든 화면을 감싼다. 헤더와 본문 폭을 여기서 정한다. 로그인 확인은 각 페이지가 다시 한다. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const visible = [];
  for (const item of NAV_ITEMS) {
    if (item.permission === undefined || (await hasPermission(item.permission)))
      visible.push(item);
  }

  return (
    <>
      <AppHeader items={visible} email={user.email} role={user.role} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </main>
    </>
  );
}
