import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePermission } from "@/lib/auth";
import { Constants } from "@/lib/supabase/database.types";
import { listUsers, PAGE_SIZE } from "./queries";
import { RoleForm } from "./role-form";

/** 사용자 관리 화면. users.manage 권한이 없으면 404 를 보여 준다. */
export default async function UsersPage({
  searchParams,
}: PageProps<"/admin/users">) {
  const actor = await requirePermission("users.manage");
  const page = Number((await searchParams).page ?? "1") || 1;
  const { rows, total } = await listUsers(page);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">사용자 관리</h1>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          아직 사용자가 없습니다. 대시보드에서 사용자를 초대하면 여기에
          나타납니다.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>가입일</TableHead>
              <TableHead>역할</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.fullName}</TableCell>
                <TableCell>{formatDate(row.createdAt)}</TableCell>
                <TableCell>
                  <RoleForm
                    userId={row.id}
                    role={row.role}
                    roles={Constants.public.Enums.app_role}
                    disabled={row.id === actor.id}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <p className="text-sm text-muted-foreground">
        전체 {total}명 · {page} / {Math.max(Math.ceil(total / PAGE_SIZE), 1)} 쪽
      </p>
    </main>
  );
}

/** 한국 시간 기준 YYYY-MM-DD. */
function formatDate(value: string): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(
    new Date(value),
  );
}
