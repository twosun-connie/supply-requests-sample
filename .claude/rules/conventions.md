---
paths:
  - "app/**"
  - "components/**"
  - "features/**"
  - "lib/**"
  - "supabase/**"
  - "test/**"
---

# 이름과 주석

이름은 읽는 사람이 파일을 열지 않고도 무엇인지 알게 짓는다. 주석은 코드가 말하지 못하는 것(왜, 주의할 것)을 적는다. 글자로 볼 수 있는 것은 검사가 막는다(§5). 이름이 뜻에 맞는지, 설명이 사실인지는 `code-reviewer`와 사람이 본다.

## 1. 코드의 이름

| 대상 | 형식 | 예 |
|---|---|---|
| 파일·폴더 | kebab-case | `request-form.tsx`, `admin/users/`. 주소 변수 폴더만 `[requestId]` |
| 컴포넌트, 타입 | PascalCase | `RequestForm`, `RequestRow`, `CreateRequestInput` |
| 함수, 변수, 속성 | camelCase | `listRequests`, `requesterId` |
| 상수(모듈 맨 위의 고정 값) | UPPER_SNAKE_CASE | `PAGE_SIZE`, `STATUS_LABEL` |
| 참·거짓 | `is`·`has`·`can`으로 시작 | `isOwnRequest`, `hasNext`, `canApprove`. HTML 속성과 같은 이름(`disabled`, `required`)과 `pending`·`ok`는 그대로 |
| 모음 | 복수형 | `requests`, `actorIds` |
| Map·Record | `《값》By《키》` | `nameByUserId`, `roleByUserId` |
| 이벤트 속성 / 처리 함수 | `on《일》` / `handle《일》` | `onSelect` / `handleSelect`(클라이언트 컴포넌트 안에서만) |

화면 폴더의 파일마다 정해진 이름이 있다.

| 파일 | 내보내는 이름 | 예 |
|---|---|---|
| `page.tsx`, `layout.tsx` | `《화면》Page`, `《영역》Layout` | `RequestDetailPage` |
| `queries.ts` | 하나 `get《대상》`, 여럿 `list《대상》`, 개수 `count《대상》`. 행의 타입은 `《대상》Row` | `getRequestDetail`, `listRequests`, `RequestRow` |
| `actions.ts` | 업무의 동사 + 대상. `get`·`handle`·`do`·`process`로 시작하지 않는다 | `createRequest`, `approveRequest` |
| `rules.ts` | 확인 `check《규칙》`(안 되면 문장, 되면 `null`), 계산 `calc《값》`, 다음 상태 `next《대상》` | `checkNotOwnRequest` |
| `schema.ts` | `《동작》《대상》Schema`, 입력 타입 `《동작》《대상》Input` | `createRequestSchema` |
| `《이름》-form.tsx` | `《이름》Form` | `RequestForm` |

- 줄이지 않는다. `req`, `usr`, `btn`, `cnt`, `tmp`, `data`, `info`, `item2`를 쓰지 않는다. 널리 쓰는 것만 허용한다: `id`, `url`, `db`, `props`, 반복문의 `index`.
- 같은 것은 어디서나 같은 이름으로 부른다. `docs/schema.md`의 낱말을 쓴다(신청 = `request`, 신청자 = `requester`). 한 저장소에 `user`·`member`·`account`가 같은 뜻으로 섞이지 않게 한다.
- DB의 이름(`full_name`)은 조회(`queries.ts`)에서 화면의 이름(`fullName`)으로 바꾼다. 화면 코드에 snake_case가 나오지 않게 한다.
- 타입이 다른 값이 섞이지 않게 이름으로 구분한다: ID는 `《대상》Id`, 이름은 `《대상》Name`, 개수는 `《대상》Count`.
- 테스트 이름은 확인하는 규칙을 한국어 문장으로 쓴다: `it("자기 신청은 승인할 수 없다")`.

## 2. DB의 이름

| 대상 | 형식 | 예 |
|---|---|---|
| 테이블 | snake_case, 복수형 | `requests`, `request_events` |
| 열 | snake_case | `full_name` |
| 기본 키 | `id` | |
| 다른 테이블을 가리키는 열 | `《가리키는 대상》_id` | `requester_id`, `item_id` |
| 시각(`timestamptz`) | `《일》_at` | `created_at`, `approved_at` |
| 날짜(`date`) | `《일》_date` 또는 뜻이 분명한 낱말 | `start_date`, `needed_by` |
| 참·거짓 | `is_`·`has_`·`can_` | `is_active` |
| enum 타입 / 값 | `《대상》_《뜻》` / 소문자 snake_case | `request_status` / `submitted`, `in_review` |
| 권한 코드 | `《대상》.《동작》` | `requests.approve` |
| 인덱스 | `《테이블》_《열 또는 뜻》_idx` | `requests_requester_id_idx` |
| 정책 | `"《테이블》: 《누가 무엇을》"` | `"requests: read own or approve"` |
| 함수 | snake_case, 동사로 시작 | `log_user_role_change` |
| 트리거 | `《테이블》_《하는 일》` | `requests_set_updated_at` |
| 마이그레이션 파일 | `《시각》_《동사》_《대상》.sql` | `…_create_requests.sql`, `…_add_requests_needed_by.sql` |

- 기본 키·외래 키·unique·check 제약의 이름은 Postgres가 짓는 대로 둔다(`requests_pkey`, `requests_requester_id_fkey`).
- 이미 적용한 이름이 규칙과 다르면 한 번에 바꾸지 않는다(`database.md` §5). 그동안은 `project.config.json`의 `db.namingExceptions`에 적고 결정 기록을 남긴다.

## 3. 코드의 주석

- **내보내는 것마다 바로 위에 `/** … */`를 쓴다**(함수, 컴포넌트, 타입, 상수). 첫 문장은 무엇을 하는지. 이어서 코드만 봐서는 모르는 것을 적는다.

| 적을 것 | 예 |
|---|---|
| 왜 이렇게 했는가 | `/** … 정책이 막은 행도 0행으로 오므로 없는 행과 같은 길로 처리한다. */` |
| 없을 때·실패할 때 돌려주는 값 | `@returns 신청과 이력. 없거나 볼 수 없으면 null. 읽지 못하면 예외(error.tsx 가 받는다)` |
| 단위·범위·허용 값 | `@param page 1 부터 시작하는 쪽 번호` |
| 누가 부르는가, 어떤 권한이 필요한가 | `/** 신청을 승인한다. requests.approve 권한이 있어야 한다. 제출 상태일 때만 된다. */` |
| 근거 문서 | `/** … docs/rules.md 「승인」 */` |

- `@param`·`@returns`는 **이름과 타입으로 알 수 없는 것이 있을 때만** 쓴다. `@param id 아이디`처럼 이름을 되풀이하지 않는다. 타입은 적지 않는다(TypeScript가 말한다).
- 함수 안의 주석은 **왜**를 적는다. 코드를 말로 옮기지 않는다.

```ts
// 나쁨: 상태를 approved 로 바꾼다
// 좋음: 읽어 둔 상태를 조건으로 붙인다. 두 사람이 동시에 눌러도 한 번만 처리된다.
.eq("status", current.data.status)
```

- 한국어 평서문으로 쓴다(「~한다」, 「~이다」). 존댓말은 화면 문구에만 쓴다.
- 주석 처리한 코드를 남기지 않는다. 옛 코드는 git에 있다.
- 남기는 일은 `TODO(《작업 기록 파일 이름 또는 담당자》): 《할 일》`로 쓰고, 작업 기록의 「하지 않은 것」에도 적는다. 근거 없는 `TODO`·`FIXME`는 쓰지 않는다.
- `loading.tsx`·`error.tsx`의 컴포넌트와 Next.js가 정한 이름(`metadata`, `dynamic`, `GET`)에는 설명을 요구하지 않는다.
- 코드를 고치면 그 위의 주석도 고친다. 사실과 다른 주석은 없는 것보다 나쁘다.

## 4. DB의 설명

DB는 코드보다 오래 남고, 대시보드·다른 도구·다음 사람이 코드 없이 본다. 그래서 설명을 DB 안에 둔다.

```sql
-- 비품 신청을 담는다. 상태 흐름과 승인 규칙은 docs/rules.md
create table public.requests ( … );
comment on table public.requests is '비품 신청. 한 행 = 신청 한 건. 상태 흐름은 docs/rules.md';
comment on column public.requests.id is '신청 번호';
comment on column public.requests.requester_id is '신청한 사람(profiles.id)';
comment on column public.requests.quantity is '수량(1 이상 100 이하)';
comment on column public.requests.status is '상태. submitted → approved 또는 rejected. 되돌아가지 않는다';
comment on column public.requests.approver_note is '승인·반려한 사람이 쓴 말. 반려면 필수(10자 이상). 처리 전에는 null';
comment on column public.requests.created_at is '신청한 시각';
```

- **테이블, 모든 열, enum 타입, 함수**에 `comment on …`을 쓴다. `id`와 `created_at`도 쓴다. 빠지면 `pnpm test:db`의 구조 검사가 실패한다.
- 테이블: 무엇을 담는가, 한 행이 무엇인가, 근거 문서.
- 열: 뜻 + 아래 가운데 해당하는 것. 열 이름을 되풀이하지 않는다.

| 열의 종류 | 적을 것 |
|---|---|
| 외래 키 | 누구를 가리키는가(`profiles.id`), 걸지 않았으면 그 이유 |
| 상태·종류 | 허용 값과 값마다의 뜻, 바뀌는 순서 |
| 수·금액 | 단위(원, 개), 범위 |
| 비어 있을 수 있는 열 | `null`이면 무슨 뜻인가 |
| 누가 채우는가 | 사용자 입력, 서버 액션, 트리거, 기본값 |
| 개인정보 | 누가 읽을 수 있는가 |

- enum 타입: 무엇의 값인가. 함수: 무엇을 하는가, 누가 부르는가(정책, 트리거, 훅).
- 마이그레이션 파일의 **첫 줄**에 `--`로 왜 필요한지 쓴다. 무엇을 하는지는 SQL이 말한다.
- 이미 적용한 테이블에 설명을 더하거나 고칠 때는 새 마이그레이션(`comment_《테이블》`)에 쓴다. `comment on`은 데이터를 건드리지 않는다.
- 열의 뜻이 바뀌면 `comment on`과 `docs/schema.md`를 함께 고친다.

## 5. 검사가 막는 것

| 검사 | 막는 것 |
|---|---|
| `pnpm check:conventions` | kebab-case가 아닌 파일·폴더, 설명 없는 내보내기, `queries`·`actions`·`rules`·`schema`·`page`의 이름 약속, 근거 없는 `TODO`, 존댓말 주석, 주석 처리한 코드, 마이그레이션 파일의 이름과 첫 줄 |
| `pnpm lint` | 변수·함수·매개변수·타입의 대소문자 형식 |
| `pnpm test:db`(구조 검사) | snake_case가 아닌 테이블·열, 설명 없는 테이블·열·enum·함수, `_at`·`is_`·`_id`·`_idx`·정책 이름 |
