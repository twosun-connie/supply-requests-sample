import "server-only";
import { createClient } from "@/lib/supabase/server";

export type SelectableItem = {
  id: number;
  name: string;
  unit: string;
};

/** 새 신청에서 고를 수 있는 품목(사용 여부가 true)을 이름순으로 가져온다. */
export async function listSelectableItems(): Promise<SelectableItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select("id, name, unit")
    .eq("is_active", true)
    .order("name");
  if (error !== null)
    throw new Error("품목 목록을 읽지 못했다", { cause: error });
  return data;
}
