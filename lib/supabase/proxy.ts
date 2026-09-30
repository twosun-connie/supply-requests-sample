import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

/** 로그인 없이 열 수 있는 경로. 새 공개 경로는 여기에만 더한다. */
// /health 는 연결 확인 화면이다. 키를 보여 주지 않는다.
const PUBLIC_PATHS = ["/login", "/auth", "/health"];

/** 세션을 갱신하고, 로그인하지 않은 요청을 /login 으로 보낸다. 루트 proxy.ts 가 부른다. */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          // 세션 쿠키를 싣는 응답이 CDN 에 캐시되지 않게 하는 헤더다. 지우지 않는다.
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
        },
      },
    },
  );

  // createServerClient 와 getClaims() 사이에 다른 코드를 넣지 않는다.
  const { data } = await supabase.auth.getClaims();
  const isPublic = PUBLIC_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (!data?.claims && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // supabaseResponse 를 그대로 반환해야 한다. 새 응답을 만들면 세션이 끊길 수 있다.
  return supabaseResponse;
}
