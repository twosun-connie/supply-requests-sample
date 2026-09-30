# excel — 엑셀 내보내기와 업로드

표기: [문서] 공식 문서에서 확인, [판단] 이 템플릿에 맞춘 조합, [확인 필요] 쓰기 전에 공식 문서로 확인.

## 먼저 묻는다: CSV로 충분한가

표 하나를 내려받는 것이면 CSV로 충분하다. 패키지가 필요 없고 이 확장을 켜지 않아도 된다(`.claude/rules/ui.md` §5). 서식·여러 시트·숫자 형식이 필요하거나 엑셀 파일을 **올려야** 할 때만 이 확장을 쓴다.

## 필요한 것

- 패키지: SheetJS. **npm 레지스트리의 `xlsx`를 설치하지 않는다.** 레지스트리 판(0.18.5)은 오래됐고 알려진 취약점이 있다 [문서].
  `pnpm add https://cdn.sheetjs.com/xlsx-《버전》/xlsx-《버전》.tgz` — 버전은 공식 설치 문서에서 확인한다 [확인 필요].
- 환경 변수·마이그레이션: 없음.

## 지킬 것 (내보내기)

1. 서버에서 만든다(Route Handler). `queries.ts`의 조회를 그대로 쓴다. 정책이 적용된다.
2. 권한을 확인한다(`requireUser()`, 필요하면 `hasPermission()`).
3. 행 수에 위 한도를 둔다(예: 10,000행). 넘으면 기간을 좁히라고 안내한다 [판단].
4. 셀이 `=`, `+`, `-`, `@`로 시작하면 앞에 `'`를 붙인다(수식 주입 방지).

## 지킬 것 (업로드)

1. 파일은 서버에서 읽는다. 브라우저에서 읽은 결과를 그대로 저장하지 않는다.
2. 읽기 전에 크기를 확인한다. 서버 액션의 본문은 기본 1MB다. 크면 `storage` 확장으로 올린 뒤 서버에서 읽는다 [문서].
3. 행 수를 자르고(`sheetRows`) Zod로 다시 검증한다 [확인 필요: 옵션 이름].
4. 저장은 사용자의 세션으로 한다. 정책이 적용된다. secret 키로 넣지 않는다.
5. 결과를 건별로 돌려준다: 몇 행을 넣었고, 어느 행이 왜 실패했는지(앞의 20건까지).
6. 전부 성공 아니면 전부 실패여야 하면 DB 함수로 묶는다(`db-functions` 확장) [판단].
7. 같은 파일을 두 번 올려도 같은 행이 두 번 들어가지 않게 한다(유니크 제약 + `upsert`) [판단].

```ts
const Row = z.object({ name: z.string().min(1).max(100), quantity: z.coerce.number().int().min(1).max(999) });
const Rows = z.array(Row).min(1).max(1000);

const workbook = XLSX.read(buffer, { type: "buffer", sheetRows: 1001 });
const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
if (sheet === undefined) return fail("시트를 찾을 수 없습니다.");
const parsed = Rows.safeParse(XLSX.utils.sheet_to_json(sheet));
if (!parsed.success) return fail(`${parsed.error.issues.length}곳을 확인해 주세요.`);
```

## 하지 않는 것

- `pnpm add xlsx`.
- 크기·행 수 제한 없이 읽기.
- BOM 없는 CSV를 Excel용으로 주기.

## 확인 방법

- `package.json`의 `xlsx` 값이 `https://cdn.sheetjs.com/…`으로 시작한다.
- 내려받은 파일을 Excel에서 열면 한글이 깨지지 않는다.
- 한도보다 많은 행, 필수 열이 빈 파일을 올리면 거부되고 DB에 행이 없다.
- 권한이 없는 계정의 업로드가 거부된다.

## 출처

- https://docs.sheetjs.com/docs/getting-started/installation/nodejs
- https://cdn.sheetjs.com/advisories/CVE-2023-30533
- https://cdn.sheetjs.com/advisories/CVE-2024-22363
- https://docs.sheetjs.com/docs/api/parse-options
- https://owasp.org/www-community/attacks/CSV_Injection
