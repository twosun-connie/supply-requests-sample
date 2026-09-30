import type { NextConfig } from "next";

/**
 * 모든 응답에 붙이는 보안 헤더. 값은 Next.js 공식 문서의 예시를 따랐다.
 * HSTS 는 Vercel 이 붙인다. 다른 곳에 배포하면 Strict-Transport-Security 를 더한다.
 * Content-Security-Policy 는 frame-ancestors 만 둔다(다른 사이트의 틀 안에 넣지 못하게 한다).
 * 스크립트까지 제한하려면 nonce 가 필요하고 모든 화면이 동적 렌더링이 된다. 필요하면 계획에서 정한다.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
