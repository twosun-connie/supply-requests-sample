// shadcn studio 의 무료 블록 statistics-component-01 의 카드. 예제 문구("than last week")를 설명 한 줄로 바꿨다.
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type StatisticsCardProps = {
  icon: ReactNode;
  value: string;
  title: string;
  description?: string;
  className?: string;
};

/** 숫자 하나를 보여 주는 통계 카드. */
export function StatisticsCard({
  icon,
  value,
  title,
  description,
  className,
}: StatisticsCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </div>
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <span className="text-sm font-semibold">{title}</span>
        {description !== undefined && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
