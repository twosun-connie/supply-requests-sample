"use client";

import { LogOutIcon } from "lucide-react";
import { logout } from "@/app/(auth)/login/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** 오른쪽 위의 사용자 메뉴. 이메일, 역할, 로그아웃. 프로필 사진은 쓰지 않고 이메일 첫 글자를 보여 준다. */
export function UserMenu({
  email,
  roleLabel,
}: {
  email: string | null;
  roleLabel: string;
}) {
  const initial = (email ?? "?").slice(0, 1).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="사용자 메뉴">
            <Avatar>
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-3 py-2 font-normal">
            <Avatar>
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="truncate text-sm font-medium text-foreground">
                {email ?? "이메일 없음"}
              </span>
              <Badge variant="secondary" className="w-fit">
                {roleLabel}
              </Badge>
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" onClick={() => void logout()}>
            <LogOutIcon />
            <span>로그아웃</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
