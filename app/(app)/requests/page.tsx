import Link from "next/link";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { hasPermission, requireUser } from "@/lib/auth";
import { Constants, type Database } from "@/lib/supabase/database.types";
import { listRequests, PAGE_SIZE } from "./queries";

type RequestStatus = Database["public"]["Enums"]["request_status"];

const STATUS_LABEL: Record<RequestStatus, string> = {
  submitted: "제출",
  approved: "승인",
  rejected: "반려",
};

const STATUS_BADGE_VARIANT: Record<
  RequestStatus,
  "outline" | "default" | "destructive"
> = {
  submitted: "outline",
  approved: "default",
  rejected: "destructive",
};

const STATUS_FILTERS: ReadonlyArray<{
  value: RequestStatus | null;
  label: string;
}> = [
  { value: null, label: "전체" },
  ...Constants.public.Enums.request_status.map((status) => ({
    value: status,
    label: STATUS_LABEL[status],
  })),
];

/** 신청 목록 화면. 로그인한 모든 사용자가 본다. requests.approve 가 있으면 전체 신청과 신청자 이름을 본다. */
export default async function RequestsPage({
  searchParams,
}: PageProps<"/requests">) {
  const actor = await requireUser();
  const canViewAll = await hasPermission("requests.approve");

  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const status = parseStatus(params.status);

  const { rows, total } = await listRequests(
    actor.id,
    canViewAll,
    page,
    status,
  );
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="신청 목록"
        description={
          canViewAll
            ? "전체 신청을 보고 승인·반려합니다."
            : "내가 낸 신청과 처리 상태를 봅니다."
        }
        actions={
          <Button nativeButton={false} render={<Link href="/requests/new" />}>
            새 신청
          </Button>
        }
      />

      <nav aria-label="상태로 거르기" className="flex flex-wrap gap-1 text-sm">
        {STATUS_FILTERS.map((filter) => (
          <Link
            key={filter.label}
            href={buildHref(filter.value, 1)}
            aria-current={status === filter.value ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1 transition-colors",
              status === filter.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <EmptyState
          title="아직 신청이 없습니다"
          description="「새 신청」을 눌러 시작하세요."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                {canViewAll && <TableHead>신청자</TableHead>}
                <TableHead>품목</TableHead>
                <TableHead>수량</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>신청일</TableHead>
                <TableHead className="sr-only">상세</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  {canViewAll && <TableCell>{row.requesterName}</TableCell>}
                  <TableCell>{row.itemName}</TableCell>
                  <TableCell>{row.quantity}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[row.status]}>
                      {STATUS_LABEL[row.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(row.createdAt)}</TableCell>
                  <TableCell>
                    <Link
                      href={`/requests/${row.id}`}
                      className="text-sm text-primary underline-offset-4 hover:underline"
                    >
                      상세 열기
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          전체 {total}건 · {page} / {totalPages} 쪽
        </p>
        <div className="flex gap-2">
          {page > 1 ? (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={buildHref(status, page - 1)} />}
            >
              이전
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              이전
            </Button>
          )}
          {page < totalPages ? (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={buildHref(status, page + 1)} />}
            >
              다음
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              다음
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** 상태 필터와 쪽 번호를 유지한 주소를 만든다. */
function buildHref(nextStatus: RequestStatus | null, nextPage: number): string {
  const query = new URLSearchParams();
  if (nextStatus !== null) query.set("status", nextStatus);
  if (nextPage > 1) query.set("page", String(nextPage));
  const search = query.toString();
  return search === "" ? "/requests" : `/requests?${search}`;
}

/** 값이 없거나 정의되지 않은 상태 값이면 전체(null)로 본다. */
function parseStatus(
  value: string | string[] | undefined,
): RequestStatus | null {
  if (typeof value !== "string") return null;
  return (
    Constants.public.Enums.request_status.find((status) => status === value) ??
    null
  );
}

/** 한국 시간 기준 YYYY-MM-DD. */
function formatDate(value: string): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(
    new Date(value),
  );
}
