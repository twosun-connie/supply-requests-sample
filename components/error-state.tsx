"use client";

import type { ReactNode } from "react";
import { TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/** 오류 상태. error.tsx 가 그대로 돌려준다. 원인(예외 문구)은 보여 주지 않는다. */
export function ErrorState({
  title,
  reset,
  action,
}: {
  title: string;
  /** error.tsx 가 받는 reset. 같은 화면을 다시 그린다. */
  reset: () => void;
  /** 「다시 시도」 옆에 둘 링크(예: 목록으로). */
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-card px-6 py-12 text-center"
    >
      <TriangleAlertIcon
        className="size-10 text-muted-foreground"
        aria-hidden
      />
      <p className="text-base font-medium">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">
        잠시 뒤 다시 시도해 주세요. 계속되면 관리자에게 알려 주세요.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={reset}>
          다시 시도
        </Button>
        {action}
      </div>
    </div>
  );
}
