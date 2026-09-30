# 권한

역할×권한 표의 원본 문서다. DB 의 `role_permissions` 와 같아야 한다(`pnpm test` 가 대조한다).
권한을 더하는 순서: 이 표에 행 추가 → 마이그레이션(`/new-migration`) → 코드.

## 역할

| 역할 | 누구 | 받는 방법 |
|---|---|---|
| `member` | 로그인한 모든 사용자(신청자) | 기본값(`user_roles` 에 행이 없으면 member) |
| `approver` | 비품 담당자 | admin 이 사용자 관리 화면에서 지정 |
| `admin` | 관리자 | 다른 admin 이 지정. 첫 admin 은 README 의 SQL 로 1회 지정 |

## 역할별 권한

`O` 는 권한이 있음, 빈칸은 없음.

| 권한 코드 | 뜻 | member | approver | admin |
|---|---|---|---|---|
| `users.manage` | 사용자의 역할을 바꾸고 프로필을 고친다 | | | O |
| `requests.approve` | 모든 신청을 보고 승인·반려한다 | | O | O |
| `items.manage` | 품목을 만들고 고친다 | | | O |

## 행 단위 규칙

권한 코드만으로 정해지지 않는 규칙이다. 정책(RLS)이 강제한다.

| 테이블 | 작업 | 누가 | 조건 |
|---|---|---|---|
| `profiles` | 조회 | 로그인한 모든 사용자 | 전체 |
| `profiles` | 생성 | 본인 | `id` 가 자기 자신 |
| `profiles` | 수정 | 본인 또는 `users.manage` | |
| `user_roles` | 조회 | 본인 또는 `users.manage` | |
| `user_roles` | 생성·수정·삭제 | `users.manage` | |
| `user_role_events` | 조회 | `users.manage` | 역할 변경 이력 |
| `user_role_events` | 생성·수정·삭제 | 아무도 | 트리거만 쓴다 |
| `items` | 조회 | 로그인한 모든 사용자 | 전체 |
| `items` | 생성·수정 | `items.manage` | |
| `items` | 삭제 | 아무도 | 쓰지 않는 품목은 사용 여부를 끈다 |
| `requests` | 조회 | 본인 또는 `requests.approve` | 본인 = 신청자 |
| `requests` | 생성 | 본인 | 신청자가 자기 자신이고 상태가 제출 |
| `requests` | 수정 | 본인 | 바꾸기 전과 뒤 모두 제출 상태이고 신청자가 자기 자신 |
| `requests` | 수정 | `requests.approve` | |
| `requests` | 삭제 | 아무도 | |
| `request_events` | 조회 | 그 신청을 볼 수 있는 사람 | |
| `request_events` | 생성 | 본인 | 행위자가 자기 자신 |
| `request_events` | 수정·삭제 | 아무도 | |
