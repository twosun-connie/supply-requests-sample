# 데이터

> 원본은 `supabase/migrations/`다. 이 문서는 사람이 읽는 요약이다. 마이그레이션을 쓸 때 같은 작업에서 함께 고친다.

## 테이블

### profiles — 사용자 프로필

| 열 | 종류 | 필수 | 기본값 | 뜻 |
|---|---|---|---|---|
| `id` | uuid | O | | auth.users 의 id |
| `full_name` | text | O | | 이름. 1~50자 |
| `created_at` | timestamptz | O | now() | 만든 시각 |
| `updated_at` | timestamptz | O | now() | 마지막으로 고친 시각 |

- 권한(grant): authenticated 에 select, insert, update
- 정책: 읽기 = 전체 / 생성 = 본인 / 수정 = 본인 또는 users.manage

### user_roles — 사용자별 역할

| 열 | 종류 | 필수 | 기본값 | 뜻 |
|---|---|---|---|---|
| `id` | bigint | O | 자동 | 행 번호 |
| `user_id` | uuid | O | | auth.users 의 id. 중복 없음 |
| `role` | app_role | O |  | 역할. 로그인 토큰의 user_role 에 들어간다(다음 로그인부터) |

### role_permissions — 역할×권한 표

| 열 | 종류 | 필수 | 기본값 | 뜻 |
|---|---|---|---|---|
| `id` | bigint | O | 자동 | 행 번호 |
| `role` | app_role | O |  | 권한을 가진 역할 |
| `permission` | app_permission | O |  | 권한 코드(대상.동작) |

### user_role_events — 역할 변경 이력

| 열 | 종류 | 필수 | 기본값 | 뜻 |
|---|---|---|---|---|
| `id` | bigint | O | 자동 | 행 번호 |
| `target_user_id` | uuid | O | | 역할이 바뀐 사용자 |
| `actor_id` | uuid | | | 바꾼 사람. 대시보드나 SQL 로 바꾸면 비어 있다 |
| `action` | text | O | | grant, change, revoke |
| `old_role` | app_role | | | 바꾸기 전 역할 |
| `new_role` | app_role | | | 바꾼 뒤 역할 |
| `created_at` | timestamptz | O | now() | 바뀐 시각 |

- 권한(grant): authenticated 에 select
- 정책: 읽기 = users.manage. 쓰기는 트리거만 한다. 3년 이상 보관

### items — 품목

| 열 | 종류 | 필수 | 기본값 | 뜻 |
|---|---|---|---|---|
| `id` | bigint | O | 자동 | 품목 번호 |
| `name` | text | O | | 이름. 1~50자. 중복 없음 |
| `unit` | text | O | '개' | 단위. 1~10자 |
| `unit_price` | integer | O | 0 | 예상 단가(원). 0 이상 |
| `is_active` | boolean | O | true | 사용 여부 |
| `created_at` | timestamptz | O | now() | 등록한 시각 |

- 권한(grant): authenticated 에 select, insert, update
- 정책: 읽기 = 전체 / 생성·수정 = items.manage

### requests — 신청

상태의 종류 이름은 `request_status`, 값은 `submitted`, `approved`, `rejected`.

| 열 | 종류 | 필수 | 기본값 | 뜻 |
|---|---|---|---|---|
| `id` | bigint | O | 자동 | 신청 번호 |
| `requester_id` | uuid | O | | 신청자. profiles.id |
| `item_id` | bigint | O | | 품목. items.id |
| `quantity` | integer | O | | 수량. 1~999 |
| `reason` | text | O | | 사유. 1~200자 |
| `needed_by` | date | | | 희망 지급일 |
| `status` | request_status | O | 'submitted' | 상태 |
| `approver_id` | uuid | | | 승인·반려한 담당자. profiles.id |
| `approver_note` | text | | | 반려 사유(1~200자). 승인했거나 처리 전이면 null |
| `created_at` | timestamptz | O | now() | 신청한 시각 |
| `updated_at` | timestamptz | O | now() | 마지막으로 바뀐 시각 |

- 권한(grant): authenticated 에 select, insert, update
- 정책: 읽기 = 본인 또는 requests.approve / 생성 = 본인·제출 상태 / 수정 = 본인의 제출 상태 또는 requests.approve
- 인덱스: (requester_id, created_at desc), (status, created_at desc), (item_id)

### request_events — 이력

| 열 | 종류 | 필수 | 기본값 | 뜻 |
|---|---|---|---|---|
| `id` | bigint | O | 자동 | 행 번호 |
| `request_id` | bigint | O | | 신청. requests.id |
| `actor_id` | uuid | O | | 상태를 바꾼 사람. profiles.id |
| `from_status` | request_status | | | 바꾸기 전 상태 |
| `to_status` | request_status | O | | 바꾼 뒤 상태 |
| `note` | text | | | 반려 사유. 승인이면 null |
| `created_at` | timestamptz | O | now() | 바뀐 시각 |

- 권한(grant): authenticated 에 select, insert
- 정책: 읽기 = 그 신청을 볼 수 있는 사람 / 생성 = 행위자가 본인
- 인덱스: (request_id, created_at)

## 변경 기록

| 날짜 | 마이그레이션 | 바꾼 것 | 이유 |
|---|---|---|---|
| 2026-01-01 | `20260101000000_rbac` | profiles, user_roles, role_permissions, 역할·권한 함수 | 시작 |
| 2026-01-10 | `20260110000000_add_approver_role_and_permissions` | 역할 approver, 권한 requests.approve·items.manage | 비품 신청 |
| 2026-01-10 | `20260110000100_create_items_requests` | items, requests, request_events | 비품 신청 |
| 2026-09-30 | `20260930045036_create_profile_on_signup` | auth.users 에 행이 생기면 profiles 행을 만드는 트리거, 기존 사용자 채움 | 초대한 사용자가 사용자 관리 화면에 나타나지 않던 문제 |
| 2026-09-30 | `20260930073756_comment_schema` | 테이블 7개의 모든 열·enum 3개·함수 4개의 설명(comment on), 정책 이름 1건 | 템플릿 v1.9.0 의 이름·설명 규칙. 데이터와 구조는 그대로 |
