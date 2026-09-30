import Link from "next/link";
import { AppLogo } from "@/components/app-logo";
import { Button } from "@/components/ui/button";

/** 어느 화면에도 맞지 않는 주소. 뼈대(사이드바) 밖에서 그려진다. */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <AppLogo />
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          화면을 찾을 수 없습니다
        </h1>
        <p className="text-sm text-muted-foreground">
          주소가 바뀌었거나 없는 화면입니다.
        </p>
      </div>
      <Button nativeButton={false} render={<Link href="/" />}>
        처음으로
      </Button>
    </div>
  );
}
