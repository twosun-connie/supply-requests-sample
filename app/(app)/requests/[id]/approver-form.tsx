"use client";

import { useActionState, useState } from "react";
import { approveRequest, rejectRequest } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ApproverForm({ requestId }: { requestId: number }) {
  const [approveState, approveAction, approveIsLoading] = useActionState(
    approveRequest,
    null,
  );

  const [rejectState, rejectFormData, rejectIsLoading] = useActionState(
    rejectRequest,
    null,
  );

  const [showRejectForm, setShowRejectForm] = useState(false);

  const approveError =
    approveState && !approveState.ok ? approveState.message : null;
  const rejectError =
    rejectState && !rejectState.ok ? rejectState.message : null;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <form action={approveAction} className="flex gap-2">
          <input type="hidden" name="id" value={requestId} />
          <Button type="submit" disabled={approveIsLoading}>
            {approveIsLoading ? "처리 중..." : "승인"}
          </Button>
          {approveError && (
            <span className="text-sm text-destructive">{approveError}</span>
          )}
        </form>

        <Button
          type="button"
          variant="outline"
          disabled={rejectIsLoading}
          onClick={() => setShowRejectForm(!showRejectForm)}
        >
          반려
        </Button>
      </div>

      {showRejectForm && (
        <form
          action={async (formData) => {
            formData.set("id", String(requestId));
            await rejectFormData(formData);
            if (rejectState?.ok) {
              setShowRejectForm(false);
            }
          }}
          className="space-y-3 border rounded-lg p-4 bg-muted/50"
        >
          <div>
            <label htmlFor="note" className="text-sm font-medium">
              반려 사유
            </label>
            <Textarea
              id="note"
              name="note"
              placeholder="반려 사유를 입력해 주세요."
              maxLength={200}
              required
              className="mt-1 min-h-20"
            />
            <p className="mt-1 text-xs text-muted-foreground">최대 200자</p>
          </div>

          {rejectError && (
            <p className="text-sm text-destructive">{rejectError}</p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={rejectIsLoading}>
              {rejectIsLoading ? "처리 중..." : "반려"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowRejectForm(false)}
              disabled={rejectIsLoading}
            >
              취소
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
