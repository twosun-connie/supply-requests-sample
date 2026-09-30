import {
  ClipboardListIcon,
  LayoutDashboardIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import type { Permission, Role } from "@/lib/auth";

/** 헤더와 사용자 메뉴에 보이는 역할 이름. docs/permissions.md 의 역할과 같다. */
export const ROLE_LABEL: Record<Role, string> = {
  admin: "관리자",
  approver: "담당자",
  member: "구성원",
};

export type NavItem = {
  href: `/${string}`;
  label: string;
  icon: LucideIcon;
  /** 사이드바의 묶음 이름. 빈 문자열이면 맨 위에 이름 없이 둔다. */
  group: string;
  /** 있으면 이 권한 코드가 있는 사용자에게만 보인다. 숨기는 것은 편의이고, 막는 것은 페이지의 requirePermission() 과 DB 정책이다. */
  permission?: Permission;
};

/**
 * 사이드바 메뉴. docs/screens.md 의 화면 목록과 같은 순서로 둔다.
 * 새 화면을 만들면 여기에 한 줄을 더한다(상세·새 항목 같은 하위 화면은 넣지 않는다).
 */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    href: "/dashboard",
    label: "대시보드",
    icon: LayoutDashboardIcon,
    group: "",
  },
  { href: "/requests", label: "신청", icon: ClipboardListIcon, group: "업무" },
  {
    href: "/admin/users",
    label: "사용자 관리",
    icon: UsersIcon,
    group: "관리",
    permission: "users.manage",
  },
];

/** 주소의 마지막 조각에 붙이는 이름. 빵부스러기(breadcrumb)가 쓴다. */
export const SEGMENT_LABEL: Record<string, string> = {
  new: "새로 만들기",
  edit: "고치기",
};
