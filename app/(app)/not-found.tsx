import Link from "next/link";
import { SearchXIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

/** 없는 화면이거나 볼 권한이 없을 때. 어느 쪽인지는 알리지 않는다(없는 것과 못 보는 것을 구분해 주지 않는다). */
export default function NotFound() {
  return (
    <EmptyState
      icon={SearchXIcon}
      title="화면을 찾을 수 없습니다"
      description="주소가 바뀌었거나 볼 수 있는 권한이 없습니다. 필요한 권한은 관리자에게 요청해 주세요."
      action={
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/" />}
        >
          처음으로
        </Button>
      }
    />
  );
}
