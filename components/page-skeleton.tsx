import { Skeleton } from "@/components/ui/skeleton";

/** 불러오는 동안의 자리 표시. loading.tsx 가 그대로 돌려준다. rows 는 본문에 놓을 줄 수. */
export function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="불러오는 중입니다">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="space-y-3 rounded-lg border bg-card p-4">
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-6 w-full" />
        ))}
      </div>
    </div>
  );
}
