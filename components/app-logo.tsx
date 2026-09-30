import { cn } from "cn";
import { SITE_NAME } from "@/lib/site";

/** 서비스 표지. 이름의 첫 글자를 네모 안에 넣는다. 로고 이미지가 생기면 이 파일만 바꾼다. */
export function AppLogo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground"
      >
        {SITE_NAME.slice(0, 1)}
      </span>
      <span className="truncate text-base font-semibold tracking-tight">
        {SITE_NAME}
      </span>
    </span>
  );
}
