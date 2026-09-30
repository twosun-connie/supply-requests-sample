"use client";

import type { ReactNode } from "react";
import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NAV_ITEMS, SEGMENT_LABEL } from "@/lib/navigation";

/** 위 띠. 사이드바 여닫기, 지금 위치(빵부스러기), 오른쪽에 사용자 메뉴(children). */
export function AppTopbar({ children }: { children: ReactNode }) {
  const crumbs = crumbsOf(usePathname());

  return (
    <header className="sticky top-0 z-40 border-b bg-card">
      <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger
            aria-label="사이드바 여닫기"
            title="사이드바 여닫기"
          />
          <Separator
            orientation="vertical"
            className="hidden h-4! data-vertical:self-center sm:block"
          />
          <Breadcrumb className="hidden min-w-0 sm:block">
            <BreadcrumbList>
              {crumbs.map((crumb, index) => (
                <Fragment key={crumb.href}>
                  {index > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {index === crumbs.length - 1 ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink render={<Link href={crumb.href} />}>
                        {crumb.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </header>
  );
}

/** 주소를 빵부스러기로 바꾼다. 메뉴에 있는 화면은 메뉴 이름, 숫자는 #번호, 그 밖은 SEGMENT_LABEL. */
function crumbsOf(pathname: string): { href: string; label: string }[] {
  const root = NAV_ITEMS.filter(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0];
  if (root === undefined) return [];

  const crumbs: { href: string; label: string }[] = [
    { href: root.href, label: root.label },
  ];
  let href: string = root.href;
  for (const segment of pathname.slice(root.href.length).split("/")) {
    if (segment === "") continue;
    href = `${href}/${segment}`;
    crumbs.push({
      href,
      label: /^\d+$/.test(segment)
        ? `#${segment}`
        : (SEGMENT_LABEL[segment] ?? decodeURIComponent(segment)),
    });
  }
  return crumbs;
}
