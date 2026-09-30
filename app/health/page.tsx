import type { Metadata } from "next";

/**
 * 연결 확인 화면. 어느 환경이 어느 Supabase 프로젝트에 연결됐는지 보여 준다.
 * 미리 보기 배포에 운영 프로젝트가 연결되는 사고를 사람이 눈으로 잡는 장치다.
 * 로그인 없이 열린다(lib/supabase/proxy.ts 의 PUBLIC_PATHS). 키는 어떤 것도 보여 주지 않는다.
 */
export const metadata: Metadata = {
  title: "연결 확인",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const ENV_LABEL: Record<string, string> = {
  production: "운영",
  preview: "미리 보기",
  development: "개발",
};

/** 연결 확인 화면. 배포가 어느 Supabase 프로젝트·커밋·리전으로 도는지 보여 준다. 로그인 없이 열리므로 키 값은 보여 주지 않는다. */
export default function HealthPage() {
  const vercelEnv = process.env.VERCEL_ENV ?? "";
  const environment = ENV_LABEL[vercelEnv] ?? "내 PC";
  const supabaseHost = hostOf(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const commit = (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7);
  const region = process.env.VERCEL_REGION ?? "";

  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-xl font-semibold">연결 확인</h1>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">환경</dt>
        <dd>{environment}</dd>
        <dt className="text-muted-foreground">Supabase 프로젝트</dt>
        <dd>{supabaseHost === "" ? "설정되지 않았습니다" : supabaseHost}</dd>
        <dt className="text-muted-foreground">커밋</dt>
        <dd>{commit === "" ? "-" : commit}</dd>
        <dt className="text-muted-foreground">실행 리전</dt>
        <dd>{region === "" ? "-" : region}</dd>
      </dl>
      <p className="text-sm text-muted-foreground">
        운영 주소에서는 운영 프로젝트가, 미리 보기와 내 PC에서는 개발 프로젝트가
        보여야 합니다.
      </p>
    </main>
  );
}

/** 주소에서 호스트만 뽑는다. 프로젝트 ID 는 호스트에 들어 있고 키는 없다. */
function hostOf(url: string | undefined): string {
  if (url === undefined || url === "") return "";
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}
