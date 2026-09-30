import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { Constants, type Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

/** 권한 코드. DB 의 app_permission enum 에서 온다. 코드는 역할 이름이 아니라 이 값을 검사한다. */
export type Permission = Database["public"]["Enums"]["app_permission"];
export type Role = Database["public"]["Enums"]["app_role"];

export type AuthUser = {
  id: string;
  email: string | null;
  role: Role;
};

/** 토큰에 역할이 없을 때의 역할. DB 의 custom_access_token_hook 과 같은 값이어야 한다. */
const DEFAULT_ROLE: Role = "member";

/**
 * 로그인한 사용자를 돌려준다. 로그인하지 않았으면 null.
 * 토큰은 getClaims() 로 검증한다. getSession() 의 값은 쿠키에서 읽은 것이라 믿지 않는다.
 */
export const getUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error !== null || data === null) return null;

  const claims = data.claims;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    role: parseRole(claims.user_role),
  };
});

/** 로그인한 사용자를 돌려준다. 로그인하지 않았으면 /login 으로 보낸다. 서버 액션과 페이지의 첫 줄에 둔다. */
export async function requireUser(): Promise<AuthUser> {
  const user = await getUser();
  if (user === null) redirect("/login");
  return user;
}

/**
 * 권한이 있는지 본다. 서버 액션에서는 없으면 DENIED 를 돌려주고, 화면에서는 버튼·메뉴를 숨기는 데 쓴다.
 * 화면에서 숨기는 것은 편의다. 실제로 막는 것은 DB 의 정책이다.
 */
export async function hasPermission(permission: Permission): Promise<boolean> {
  return (await getPermissions()).has(permission);
}

/** 페이지·레이아웃용. 로그인하지 않았으면 /login, 권한이 없으면 404 를 보여 준다. */
export async function requirePermission(
  permission: Permission,
): Promise<AuthUser> {
  const user = await requireUser();
  if (!(await hasPermission(permission))) notFound();
  return user;
}

/** 역할×권한 표의 원본은 DB 의 role_permissions 다. 요청 하나에 한 번만 읽는다. */
const getPermissions = cache(async (): Promise<ReadonlySet<Permission>> => {
  const user = await getUser();
  if (user === null) return new Set();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("role_permissions")
    .select("permission")
    .eq("role", user.role);
  if (error !== null) {
    // 읽지 못하면 권한이 없는 것으로 본다(안전한 쪽으로 실패).
    console.error("role_permissions 를 읽지 못했다", { code: error.code });
    return new Set();
  }
  return new Set(data.map((row) => row.permission));
});

function parseRole(value: unknown): Role {
  return (
    Constants.public.Enums.app_role.find((role) => role === value) ??
    DEFAULT_ROLE
  );
}
