import { Skeleton } from "@/components/ui/skeleton";

/** 대시보드를 읽는 동안 보여 준다. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Skeleton className="h-10 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-32" />
        ))}
      </div>
    </div>
  );
}
