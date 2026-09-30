"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import type { ActionResult } from "@/lib/action";
import type { Role } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/navigation";
import { changeUserRole } from "./actions";

type Props = {
  userId: string;
  role: Role;
  roles: readonly Role[];
  disabled: boolean;
};

/** 역할 변경 폼. 상호작용이 있는 부분만 클라이언트 컴포넌트로 둔다. */
export function RoleForm({ userId, role, roles, disabled }: Props) {
  const [result, action, pending] = useActionState<
    ActionResult | null,
    FormData
  >(changeUserRole, null);

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <NativeSelect
        name="role"
        defaultValue={role}
        disabled={disabled || pending}
        aria-label="역할"
      >
        {roles.map((option) => (
          <NativeSelectOption key={option} value={option}>
            {ROLE_LABEL[option]}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={disabled || pending}
      >
        {pending ? "바꾸는 중" : "바꾸기"}
      </Button>
      <span role="status" className="text-sm text-muted-foreground">
        {result === null ? "" : result.ok ? "바꿨습니다." : result.message}
      </span>
    </form>
  );
}
