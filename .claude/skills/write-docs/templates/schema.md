# 데이터

> 원본은 `supabase/migrations/`다. 이 문서는 사람이 읽는 요약이다. 마이그레이션을 쓸 때 같은 작업에서 함께 고친다.
> 열의 「뜻」은 마이그레이션의 `comment on column`과 같은 말로 쓴다(DB 안의 설명이 원본이다). 이름 짓는 법은 `.claude/rules/conventions.md` §2.

## 테이블

### 《requests》 — 《신청》

| 열 | 종류 | 필수 | 기본값 | 뜻 |
|---|---|---|---|---|
| `id` | bigint | O | 자동 | 《신청 번호》 |
| 《`requester_id`》 | uuid | O | | 《신청한 사람. profiles.id》 |

- 권한(grant): 《authenticated 에 select, insert, update》
- 정책: 《읽기 = 본인 또는 requests.approve / 생성 = 본인 / 수정 = 본인의 제출 상태》
- 인덱스: 《(requester_id, created_at desc)》

## 변경 기록

| 날짜 | 마이그레이션 | 바꾼 것 | 이유 |
|---|---|---|---|
| 《2026-01-01》 | 《create_requests》 | 《requests 테이블 생성》 | |
