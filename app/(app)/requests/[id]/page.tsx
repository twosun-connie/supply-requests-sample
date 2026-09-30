import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { hasPermission, requireUser } from "@/lib/auth";
import type { Database } from "@/lib/supabase/database.types";
import { getRequestDetail } from "./queries";
import { ApproverForm } from "./approver-form";

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

/** 신청 상세 화면. 신청자 본인 또는 requests.approve 권한이 있는 사람이 본다. */
export default async function RequestDetailPage({
  params,
}: PageProps<"/requests/[id]">) {
  const actor = await requireUser();
  const canApprove = await hasPermission("requests.approve");

  const resolvedParams = await params;
  const requestId = Number(resolvedParams.id);
  if (isNaN(requestId)) notFound();

  const detail = await getRequestDetail(actor.id, requestId, canApprove);
  if (detail === null) notFound();
  const { request, events } = detail;

  const isOwnRequest = request.requesterId === actor.id;
  const canShowApprovalButton =
    canApprove && request.status === "submitted" && !isOwnRequest;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        title={`신청 #${request.id}`}
        description={`${request.itemName} · ${STATUS_LABEL[request.status]}`}
        actions={
          <>
            <Badge variant={STATUS_BADGE_VARIANT[request.status]}>
              {STATUS_LABEL[request.status]}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/requests" />}
            >
              목록으로
            </Button>
          </>
        }
      />

      {/* 신청 정보 */}
      <section className="space-y-4 rounded-lg border bg-card p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">품목</p>
            <p className="font-medium">{request.itemName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">수량</p>
            <p className="font-medium">
              {request.quantity}
              {request.itemName ? " " : ""}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">신청자</p>
            <p className="font-medium">{request.requesterName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">신청일</p>
            <p className="font-medium">{formatDate(request.createdAt)}</p>
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">사유</p>
          <p className="whitespace-pre-wrap rounded bg-muted px-3 py-2 text-sm">
            {request.reason}
          </p>
        </div>

        {request.neededBy && (
          <div>
            <p className="text-sm text-muted-foreground">희망 지급일</p>
            <p className="font-medium">{formatDate(request.neededBy)}</p>
          </div>
        )}
      </section>

      {/* 승인·반려 정보 */}
      {request.status !== "submitted" && (
        <section className="space-y-4 rounded-lg border bg-muted/40 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">처리 담당자</p>
              <p className="font-medium">{request.approverName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">처리일</p>
              <p className="font-medium">{formatDate(request.updatedAt)}</p>
            </div>
          </div>

          {request.approverNote && (
            <div>
              <p className="text-sm text-muted-foreground">담당자 메모</p>
              <p className="whitespace-pre-wrap rounded bg-background px-3 py-2 text-sm">
                {request.approverNote}
              </p>
            </div>
          )}
        </section>
      )}

      {/* 승인·반려 버튼 */}
      {canShowApprovalButton && (
        <section className="flex gap-2 border-t pt-4">
          <ApproverForm requestId={requestId} />
        </section>
      )}

      {/* 이력 */}
      {events.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">이력</h2>
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="border-l-2 border-muted pl-4 py-2 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{event.actorName}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(event.createdAt)}
                  </span>
                </div>
                <p className="text-muted-foreground">
                  {event.fromStatus ? (
                    <>
                      {STATUS_LABEL[event.fromStatus]} →{" "}
                      {STATUS_LABEL[event.toStatus]}
                    </>
                  ) : (
                    <>{STATUS_LABEL[event.toStatus]} (생성)</>
                  )}
                </p>
                {event.note && <p className="mt-1 text-sm">{event.note}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** 한국 시간 기준 YYYY-MM-DD. */
function formatDate(value: string): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(
    new Date(value),
  );
}

/** 한국 시간 기준 YYYY-MM-DD HH:mm. */
function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
