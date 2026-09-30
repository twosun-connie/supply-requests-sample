import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { listSelectableItems } from "./queries";
import { RequestForm } from "./request-form";

/** 새 신청 화면. 로그인한 모든 사용자가 쓴다. 쓰는 품목이 없으면 폼 대신 안내 문구를 보여 준다. */
export default async function NewRequestPage() {
  await requireUser();
  const items = await listSelectableItems();

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <PageHeader
        title="새 신청"
        description="품목과 수량, 사유를 적어 제출합니다."
      />
      {items.length === 0 ? (
        <EmptyState
          title="신청할 수 있는 품목이 없습니다"
          description="관리자에게 문의해 주세요."
        />
      ) : (
        <RequestForm items={items} />
      )}
    </div>
  );
}
