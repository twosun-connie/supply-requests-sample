-- 테이블·열·타입·함수에 설명을 단다. 템플릿 v1.9.0 의 구조 검사가 설명을 요구한다(.claude/rules/conventions.md §4). 데이터와 구조는 바꾸지 않는다.

-- 역할·권한(시작 마이그레이션의 것)
comment on type public.app_role is '역할. 새 역할은 alter type … add value 로 더한다';
comment on type public.app_permission is '권한 코드(대상.동작). 코드와 정책은 역할이 아니라 이 값을 검사한다';
comment on table public.profiles is '사용자 프로필. auth.users 와 1:1. 사용자가 생기면 트리거(private.create_profile_for_new_user)가 만든다';
comment on column public.profiles.id is '사용자 ID. auth.users.id 와 같다';
comment on column public.profiles.full_name is '화면에 보이는 이름(1~50자). 처음에는 초대할 때 넣은 이름이나 이메일의 @ 앞부분';
comment on column public.profiles.created_at is '만든 시각';
comment on column public.profiles.updated_at is '마지막으로 고친 시각';
comment on table public.user_roles is '사용자별 역할. 사용자마다 한 행. 행이 없으면 member';
comment on column public.user_roles.id is '행 번호';
comment on column public.user_roles.user_id is '역할을 받은 사용자(auth.users.id)';
comment on column public.user_roles.role is '역할. 로그인 토큰의 user_role 에 들어간다(다음 로그인부터)';
comment on table public.role_permissions is '역할×권한 표의 원본. 한 행 = 역할 하나가 가진 권한 하나. docs/permissions.md 와 같아야 한다';
comment on column public.role_permissions.id is '행 번호';
comment on column public.role_permissions.role is '권한을 가진 역할';
comment on column public.role_permissions.permission is '권한 코드(대상.동작)';
comment on function public.custom_access_token_hook(jsonb) is '로그인 토큰에 user_role 을 넣는 훅. Supabase Auth 가 토큰을 만들 때 부른다. 대시보드에서 켜야 동작한다';
comment on function public.authorize(public.app_permission) is '토큰의 역할에 이 권한이 있는지 돌려준다. 정책이 (select public.authorize(…)) 로 부른다';
comment on table public.user_role_events is '역할 변경 이력. 한 행 = 변경 한 번. 트리거가 남긴다. 고치거나 지우지 않는다. 3년 이상 보관';
comment on column public.user_role_events.id is '행 번호';
comment on column public.user_role_events.target_user_id is '역할이 바뀐 사용자(auth.users.id). 사용자를 지워도 이력이 남도록 외래 키를 걸지 않는다';
comment on column public.user_role_events.actor_id is '바꾼 사람(auth.users.id). 대시보드나 SQL 로 바꾸면 null';
comment on column public.user_role_events.action is '무엇을 했는가. grant(처음 줌), change(바꿈), revoke(거둠)';
comment on column public.user_role_events.old_role is '바꾸기 전 역할. 처음 줄 때는 null';
comment on column public.user_role_events.new_role is '바꾼 뒤 역할. 거둘 때는 null';
comment on column public.user_role_events.created_at is '바뀐 시각';
comment on function private.log_user_role_change() is 'user_roles 가 바뀌면 user_role_events 에 한 행을 남긴다. 트리거 user_roles_log_change 가 부른다';
comment on function private.create_profile_for_new_user() is 'auth.users 에 사용자가 생기면 profiles 에 한 행을 만든다. 트리거 on_auth_user_created 가 부른다';

-- 품목
comment on type public.request_status is '신청의 상태. submitted(제출) → approved(승인) 또는 rejected(반려). 되돌아가지 않는다';
comment on table public.items is '신청할 수 있는 품목. 한 행 = 품목 하나. items.manage 권한이 관리한다';
comment on column public.items.id is '품목 번호';
comment on column public.items.name is '품목 이름(1~50자). 중복 없음';
comment on column public.items.unit is '세는 단위(1~10자). 예: 개, 박스';
comment on column public.items.unit_price is '예상 단가(원, 0 이상). 승인 판단용';
comment on column public.items.is_active is '신청할 수 있는가. false 면 새 신청의 목록에 나오지 않는다(지난 신청에는 남는다)';
comment on column public.items.created_at is '등록한 시각';

-- 신청
comment on table public.requests is '비품 신청. 한 행 = 신청 한 건. 상태 흐름과 승인 규칙은 docs/rules.md';
comment on column public.requests.id is '신청 번호';
comment on column public.requests.requester_id is '신청한 사람(profiles.id)';
comment on column public.requests.item_id is '신청한 품목(items.id)';
comment on column public.requests.quantity is '수량(1~999). 단위는 items.unit';
comment on column public.requests.reason is '신청 사유(1~200자). 신청자가 쓴다';
comment on column public.requests.needed_by is '받고 싶은 날. 없으면 null';
comment on column public.requests.status is '상태. 승인·반려는 서버 액션이 바꾼다';
comment on column public.requests.approver_id is '승인·반려한 사람(profiles.id). 처리 전에는 null';
comment on column public.requests.approver_note is '반려 사유(1~200자). 승인했거나 처리 전이면 null';
comment on column public.requests.created_at is '신청한 시각';
comment on column public.requests.updated_at is '마지막으로 바뀐 시각';

-- 상태 변경 이력
comment on table public.request_events is '신청의 상태 변경 이력. 한 행 = 승인 또는 반려 한 번. 서버 액션이 상태를 바꿀 때 남긴다';
comment on column public.request_events.id is '행 번호';
comment on column public.request_events.request_id is '바뀐 신청(requests.id)';
comment on column public.request_events.actor_id is '바꾼 사람(profiles.id)';
comment on column public.request_events.from_status is '바꾸기 전 상태';
comment on column public.request_events.to_status is '바꾼 뒤 상태';
comment on column public.request_events.note is '반려 사유. 승인이면 null';
comment on column public.request_events.created_at is '바뀐 시각';

-- 정책 이름을 「《테이블》: 《누가 무엇을》」 형식으로 맞춘다. 조건은 그대로다.
drop policy if exists "auth admin reads user roles" on public.user_roles;
create policy "user_roles: read by auth admin" on public.user_roles
  for select to supabase_auth_admin using (true);
