"use client";

import { ErrorState } from "@/components/error-state";

export default function ErrorView({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return <ErrorState title="품목 목록을 불러오지 못했습니다" reset={reset} />;
}
