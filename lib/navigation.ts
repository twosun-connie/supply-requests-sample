import type { Permission, Role } from "@/lib/auth";

/** 헤더에 보이는 역할 이름. docs/permissions.md 의 역할과 같다. */
export const ROLE_LABEL: Record<Role, string> = {
  admin: "관리자",
  approver: "담당자",
  member: "구성원",
};

export type NavItem = {
  href: `/${string}`;
  label: string;
  /** 있으면 이 권한 코드가 있는 사용자에게만 보인다. 숨기는 것은 편의이고, 막는 것은 페이지의 requirePermission() 과 DB 정책이다. */
  permission?: Permission;
};

/**
 * 상단 메뉴. docs/screens.md 의 화면 목록과 같은 순서로 둔다.
 * 새 화면을 만들면 여기에 한 줄을 더한다(상세·새 항목 같은 하위 화면은 넣지 않는다).
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/requests", label: "신청" },
  { href: "/admin/users", label: "사용자 관리", permission: "users.manage" },
];
