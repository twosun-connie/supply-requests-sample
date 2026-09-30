// 이 템플릿의 ESLint 규칙. eslint.config.mjs 에서 ...projectRules 로 펼쳐 쓴다.
// 문맥이 필요한 검사(어느 파일에서 무엇을 부르는가)를 맡는다. 비밀 값과 파일 보호는 .claude 의 훅이 맡는다.

const GET_SESSION = {
  selector: "CallExpression[callee.property.name='getSession']",
  message:
    "getSession() 의 값은 쿠키에서 읽은 것이라 믿을 수 없다. lib/auth.ts 의 getUser()·requireUser() 를 쓴다.",
};
const SELECT_ALL = {
  selector:
    "CallExpression[callee.property.name='select'][arguments.0.value='*']",
  message:
    "select('*') 는 화면에 필요 없는 열까지 가져온다. 필요한 열 이름을 적는다.",
};
const ROLE_COMPARE = {
  selector:
    "BinaryExpression[operator=/^[!=]==?$/]:matches([left.property.name=/^(role|user_role)$/][right.type='Literal'], [right.property.name=/^(role|user_role)$/][left.type='Literal'])",
  message:
    "역할 이름을 직접 비교하지 않는다. 권한 코드를 검사한다: hasPermission('대상.동작').",
};
const RAW_ENV = {
  selector:
    "MemberExpression[object.object.name='process'][object.property.name='env'][property.name=/^SUPABASE_[A-Z_]*(SECRET|SERVICE_ROLE)/]",
  message:
    "secret 키는 lib/supabase/admin.ts 한 곳에서만 읽는다(admin-api 확장).",
};
const AS_ASSERTION = {
  selector: "TSAsExpression:not([typeAnnotation.typeName.name='const'])",
  message:
    "as 로 타입을 단언하지 않는다. 값을 검증해 좁힌다(Zod, 타입 가드). DB 의 enum 은 Database['public']['Enums'] 의 타입을 쓴다.",
};
const BASE = [GET_SESSION, SELECT_ALL, ROLE_COMPARE, RAW_ENV];

export const projectRules = [
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-expect-error": "allow-with-description",
          "ts-ignore": true,
          "ts-nocheck": true,
        },
      ],
      "no-restricted-syntax": ["error", ...BASE],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@supabase/supabase-js",
              importNames: ["createClient"],
              message: "lib/supabase 의 클라이언트를 쓴다.",
            },
            {
              name: "@supabase/ssr",
              message: "lib/supabase 의 클라이언트를 쓴다.",
            },
          ],
        },
      ],
    },
  },
  {
    // 직접 쓰는 앱 코드. shadcn/ui 가 만든 파일(components/ui, lib/utils.ts)은 빼고 본다.
    files: [
      "app/**/*.{ts,tsx}",
      "features/**/*.{ts,tsx}",
      "components/*.{ts,tsx}",
      "lib/*.ts",
    ],
    ignores: ["lib/utils.ts"],
    rules: { "no-restricted-syntax": ["error", ...BASE, AS_ASSERTION] },
  },
  {
    // Supabase 클라이언트를 만드는 곳. 공식 예제의 코드를 그대로 둔다.
    files: ["lib/supabase/**/*.ts"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    files: ["lib/supabase/admin.ts"],
    rules: {
      "no-restricted-syntax": ["error", GET_SESSION, SELECT_ALL, ROLE_COMPARE],
    },
  },
  {
    // 역할 값을 다루는 유일한 곳.
    files: ["lib/auth.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        GET_SESSION,
        SELECT_ALL,
        RAW_ENV,
        AS_ASSERTION,
      ],
    },
  },
  {
    files: ["**/*.test.{ts,tsx}", "test/**/*.ts"],
    rules: { "no-restricted-syntax": "off", "no-console": "off" },
  },
];
