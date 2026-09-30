"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/action";
import { setPassword } from "./actions";

export function SetPasswordForm({ minLength }: { minLength: number }) {
  const [result, action, pending] = useActionState<
    ActionResult | null,
    FormData
  >(setPassword, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="password">새 비밀번호</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={minLength}
            required
          />
          <FieldDescription>
            {minLength}자 이상으로 정해 주세요.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm">새 비밀번호 확인</FieldLabel>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
          />
        </Field>
      </FieldGroup>
      <Button type="submit" disabled={pending}>
        {pending ? "저장하는 중" : "비밀번호 정하기"}
      </Button>
      <p role="status" className="text-sm text-destructive">
        {result !== null && !result.ok ? result.message : ""}
      </p>
    </form>
  );
}
