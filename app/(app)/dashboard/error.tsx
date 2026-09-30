"use client";

import { Button } from "@/components/ui/button";

export default function ErrorView({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-2 p-4">
      <p className="text-sm">신청 목록을 불러오지 못했습니다.</p>
      <Button variant="outline" size="sm" onClick={reset}>
        다시 시도
      </Button>
    </div>
  );
}
