// 업무 규칙. 순수 함수만 둔다. DB·요청·쿠키를 받지 않는다. 그래서 단위 테스트가 된다.
// 규칙의 원본은 docs/rules.md 다. 문서와 다르게 고치지 않는다.

/**
 * 신청에 쓸 품목을 고를 수 있는지 본다. 폼은 사용 품목만 보여 주지만, 서버 액션을
 * 직접 부르면 우회될 수 있어 다시 확인한다. 안 되면 사용자에게 보여 줄 이유를 돌려준다.
 */
export function checkItemSelectable(
  item: { isActive: boolean } | null,
): string | null {
  if (item === null) return "품목을 찾을 수 없습니다.";
  if (!item.isActive) return "쓰지 않는 품목은 새 신청에서 고를 수 없습니다.";
  return null;
}
