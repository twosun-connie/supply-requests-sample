// 업무 규칙. 순수 함수만 둔다. DB·요청·쿠키를 받지 않는다. 그래서 단위 테스트가 된다.
// 규칙의 원본은 docs/rules.md 다. 문서와 다르게 고치지 않는다.

/**
 * 역할을 바꿀 수 있는지 본다. 안 되면 사용자에게 보여 줄 이유를 돌려준다.
 * 인자는 이름 붙은 객체로 받는다. 문자열을 순서대로 받으면 자리를 바꿔 넣어도 타입 검사가 통과한다.
 */
export function checkRoleChange({
  actorId,
  targetId,
}: {
  actorId: string;
  targetId: string;
}): string | null {
  // 자기 역할을 바꿀 수 있으면 마지막 관리자가 스스로 권한을 잃어 아무도 관리하지 못하게 된다.
  if (actorId === targetId) return "자기 자신의 역할은 바꿀 수 없습니다.";
  return null;
}
