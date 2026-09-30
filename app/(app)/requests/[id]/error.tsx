"use client";

import Link from "next/link";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";

export default function ErrorView({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <ErrorState
      title="신청을 읽지 못했습니다"
      reset={reset}
      action={
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/requests" />}
        >
          목록으로
        </Button>
      }
    />
  );
}
