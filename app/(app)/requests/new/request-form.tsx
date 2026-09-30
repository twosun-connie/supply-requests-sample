"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action";
import { createRequest } from "./actions";
import type { SelectableItem } from "./queries";

type Props = {
  items: SelectableItem[];
};

/** 새 신청 폼. 상호작용이 있는 부분만 클라이언트 컴포넌트로 둔다. 검증은 서버 액션의 Zod 스키마가 한다. */
export function RequestForm({ items }: Props) {
  const [result, action, pending] = useActionState<
    ActionResult | null,
    FormData
  >(createRequest, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="itemId">품목</FieldLabel>
          <NativeSelect
            id="itemId"
            name="itemId"
            required
            disabled={pending}
            defaultValue=""
            aria-describedby="request-form-status"
          >
            <NativeSelectOption value="" disabled>
              품목을 선택해 주세요.
            </NativeSelectOption>
            {items.map((item) => (
              <NativeSelectOption key={item.id} value={item.id}>
                {item.name} ({item.unit})
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        <Field>
          <FieldLabel htmlFor="quantity">수량</FieldLabel>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            inputMode="numeric"
            min={1}
            max={999}
            step={1}
            defaultValue={1}
            required
            disabled={pending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="reason">사유</FieldLabel>
          <Textarea
            id="reason"
            name="reason"
            maxLength={200}
            required
            disabled={pending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="neededBy">희망 지급일</FieldLabel>
          <Input id="neededBy" name="neededBy" type="date" disabled={pending} />
        </Field>
      </FieldGroup>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "제출하는 중" : "제출"}
        </Button>
        <span
          id="request-form-status"
          role="status"
          className="text-sm text-destructive"
        >
          {result === null || result.ok ? "" : result.message}
        </span>
      </div>
    </form>
  );
}
