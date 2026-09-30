import type { ReactNode } from "react";
import { InboxIcon, type LucideIcon } from "lucide-react";

/** 빈 상태. 왜 비었는지와 다음에 할 일을 한 문장으로 적고, 필요하면 버튼을 둔다. */
export function EmptyState({
  title,
  description,
  action,
  icon: Icon = InboxIcon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-card px-6 py-12 text-center">
      <Icon className="size-10 text-muted-foreground" aria-hidden />
      <p className="text-base font-medium">{title}</p>
      {description !== undefined && (
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {action !== undefined && <div className="mt-2">{action}</div>}
    </div>
  );
}
