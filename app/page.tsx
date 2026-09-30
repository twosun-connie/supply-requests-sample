import { redirect } from "next/navigation";

/** 첫 화면. 시작 화면이 정해지면 그 경로로 바꾼다. */
export default function HomePage() {
  redirect("/dashboard");
}
