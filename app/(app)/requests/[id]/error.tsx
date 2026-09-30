"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RequestDetailError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4">
      <div className="space-y-3 border border-destructive rounded-lg p-4 bg-destructive/5">
        <h1 className="font-semibold">신청을 읽지 못했습니다</h1>
        <p className="text-sm text-muted-foreground">
          일시적인 오류입니다. 잠시 뒤 다시 시도해 주세요.
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={reset}>
            다시 시도
          </Button>
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href="/requests" />}
          >
            목록으로
          </Button>
        </div>
      </div>
    </main>
  );
}
