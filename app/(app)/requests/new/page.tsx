import { requireUser } from "@/lib/auth";
import { listSelectableItems } from "./queries";
import { RequestForm } from "./request-form";

/** 새 신청 화면. 로그인한 모든 사용자가 쓴다. 쓰는 품목이 없으면 폼 대신 안내 문구를 보여 준다. */
export default async function NewRequestPage() {
  await requireUser();
  const items = await listSelectableItems();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">새 신청</h1>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          신청할 수 있는 품목이 없습니다. 관리자에게 문의해 주세요.
        </p>
      ) : (
        <RequestForm items={items} />
      )}
    </main>
  );
}
