/**
 * 사용자가 입력한 검색어를 ilike 의 패턴으로 바꾼다. 검색어 안의 %, _, *, \ 는 글자 그대로 찾게 한다.
 * 필터 문자열(.or(), .filter())에 검색어를 끼워 넣지 않는다. 이 함수의 결과를 .ilike(열, 패턴) 의 인자로 넘긴다.
 *
 * @param keyword 사용자가 입력한 검색어
 * @returns 앞뒤에 % 를 붙인 패턴. 검색어가 비면 빈 문자열(조건을 붙이지 않는다)
 */
export function toContainsPattern(keyword: string): string {
  const trimmed = keyword.trim().slice(0, MAX_KEYWORD_LENGTH);
  if (trimmed === "") return "";
  return `%${trimmed.replace(/[\\%_*]/g, (char) => `\\${char}`)}%`;
}

const MAX_KEYWORD_LENGTH = 100;
