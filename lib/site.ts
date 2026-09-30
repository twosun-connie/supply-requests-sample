import config from "@/project.config.json";

/** 서비스 이름과 한 줄 설명. project.config.json 에서 읽는다. 화면 제목, 헤더, 로그인 화면이 쓴다. */
export const SITE_NAME: string =
  typeof config.name === "string" && config.name.trim() !== ""
    ? config.name
    : "사내 도구";
export const SITE_DESCRIPTION: string =
  typeof config.description === "string" ? config.description : "";
