import config from "@/project.config.json";

/** 서비스 이름. project.config.json 의 name 에서 읽는다. 화면 제목, 사이드바, 로그인 화면이 쓴다. */
export const SITE_NAME: string =
  typeof config.name === "string" && config.name.trim() !== ""
    ? config.name
    : "사내 도구";
/** 서비스 한 줄 설명. project.config.json 의 description 에서 읽는다. 비어 있을 수 있다. */
export const SITE_DESCRIPTION: string =
  typeof config.description === "string" ? config.description : "";
