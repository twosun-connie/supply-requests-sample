import Link from "next/link";
import {
  CircleCheckIcon,
  CircleXIcon,
  ClipboardListIcon,
  HourglassIcon,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatisticsCard } from "@/components/shadcn-studio/blocks/statistics-card-01";
import { Button } from "@/components/ui/button";
import { hasPermission, requireUser } from "@/lib/auth";
import { countRequestsByStatus } from "./queries";

export const metadata = { title: "대시보드" };

/** 대시보드. 상태별 신청 건수를 보여 준다. 담당자에게는 전체, 그 밖에는 자기 신청의 건수다. */
export default async function DashboardPage() {
  await requireUser();
  const [counts, canApprove] = await Promise.all([
    countRequestsByStatus(),
    hasPermission("requests.approve"),
  ]);
  const total = counts.submitted + counts.approved + counts.rejected;
  const scope = canApprove ? "전체 신청" : "내 신청";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="대시보드"
        description={`${scope}의 처리 현황입니다.`}
        actions={
          <Button nativeButton={false} render={<Link href="/requests/new" />}>
            새 신청
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatisticsCard
          icon={<HourglassIcon className="size-4" />}
          value={String(counts.submitted)}
          title="처리 대기"
          description={
            canApprove ? "승인·반려를 기다립니다" : "담당자가 검토 중입니다"
          }
        />
        <StatisticsCard
          icon={<CircleCheckIcon className="size-4" />}
          value={String(counts.approved)}
          title="승인"
          description="승인된 신청"
        />
        <StatisticsCard
          icon={<CircleXIcon className="size-4" />}
          value={String(counts.rejected)}
          title="반려"
          description="반려된 신청"
        />
        <StatisticsCard
          icon={<ClipboardListIcon className="size-4" />}
          value={String(total)}
          title="전체"
          description={scope}
        />
      </div>
      <div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/requests?status=submitted" />}
        >
          처리 대기 신청 보기
        </Button>
      </div>
    </div>
  );
}
