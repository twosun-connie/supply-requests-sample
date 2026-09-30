"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/action";
import { login } from "./actions";

/** 로그인 폼. next 는 로그인 뒤에 돌아갈 경로다. 서버가 내부 경로인지 다시 확인한다. */
export function LoginForm({ next }: { next: string }) {
  const [result, action, pending] = useActionState<
    ActionResult | null,
    FormData
  >(login, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">이메일</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">비밀번호</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
      </FieldGroup>
      <Button type="submit" disabled={pending}>
        {pending ? "로그인하는 중" : "로그인"}
      </Button>
      <p role="status" className="text-sm text-destructive">
        {result !== null && !result.ok ? result.message : ""}
      </p>
    </form>
  );
}
