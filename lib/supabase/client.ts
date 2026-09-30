import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/** 브라우저용 클라이언트. 클라이언트 컴포넌트에서만 쓴다. */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
