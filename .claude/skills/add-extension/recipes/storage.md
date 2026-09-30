# storage — 파일 첨부

표기: [문서] 공식 문서에서 확인, [판단] 이 템플릿에 맞춘 조합, [실측] 이 템플릿의 DB 테스트로 확인, [확인 필요] 쓰기 전에 공식 문서로 확인.

## 필요한 것

- 패키지·환경 변수: 없음.
- 마이그레이션: 버킷 만들기와 `storage.objects` 정책.
- 대시보드: Storage의 전역 파일 크기 제한. 버킷의 제한은 전역 제한보다 클 수 없다 [문서].

## 지킬 것

1. 버킷은 비공개(`public = false`)로 만든다. 공개 버킷은 조회에서 정책을 우회한다 [문서].
2. 정책은 작업별로 쓰고 `bucket_id = '…'`와 `to authenticated`를 넣는다. 정책이 없으면 업로드가 거부된다 [문서].
3. 경로의 첫 폴더를 주인의 ID로 한다: `《사용자 ID》/《무작위 값》`. 정책에서 `(storage.foldername(name))[1]`로 비교한다 [문서].
4. 경로와 파일 이름은 **서버가 정한다**. 사용자가 보낸 이름을 경로에 쓰지 않는다. 원래 이름은 DB의 열에 둔다 [판단].
5. 업로드는 브라우저에서 Storage로 직접 한다. 서버 액션이 서명 업로드 주소를 만들고 브라우저가 올린다. 서버 액션의 본문은 기본 1MB, Vercel 함수는 4.5MB까지다 [문서].
6. 크기와 형식 제한은 버킷 설정에 둔다(`file_size_limit`, `allowed_mime_types`) [문서]. 마이그레이션의 insert 문에 이 두 열을 넣는 공식 예시는 없다 [확인 필요].
7. 내려받기는 서명 주소(`createSignedUrl`)로, 짧은 만료 시간으로 한다.
8. 지울 때는 API(`remove()`)를 쓴다. SQL로 `storage.objects`의 행을 지우면 파일이 남는다 [문서].
9. 첨부의 주인·연결된 업무 행은 `public`의 테이블에 기록하고 그 테이블에도 grant + RLS + 정책을 쓴다 [판단].

```sql
insert into storage.buckets (id, name, public) values ('attachments', 'attachments', false);

create policy "attachments: insert own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "attachments: read own folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid()::text));
```

권한 코드로 열려면 조건에 `or (select public.authorize('files.read'))`를 더한다 [판단].

## 하지 않는 것

- 공개 버킷을 만들고 정책으로 막았다고 여기기.
- 파일을 서버 액션의 인자로 넘기기.
- secret 키로 올리기(주인이 기록되지 않고 정책을 우회한다) [문서].
- `alter table storage.objects enable row level security` 쓰기(이미 켜져 있다. `storage` 스키마를 바꾸지 않는다).

## DB 테스트

`test/db/support/`의 흉내 환경에 `storage.buckets`, `storage.objects`, `storage.foldername()`이 있다. 그래서 정책을 테스트할 수 있다: 자기 폴더에 올리기, 남의 폴더에 올리기, 남의 파일 읽기. 본보기는 `../examples/extensions.rls.test.ts` [실측].

확인하지 못하는 것: 실제 파일 저장, 서명 주소, 크기·형식 제한. 사용자가 개발 DB에 적용한 뒤 브라우저에서 확인한다.

## 확인 방법

- 대시보드 Storage: 버킷이 Private이고 크기·형식 제한이 맞다.
- 다른 계정으로 남의 파일의 서명 주소를 요청하면 실패한다.
- 허용하지 않은 형식과 제한보다 큰 파일이 거부된다.
- 서명 주소가 만료된 뒤에는 열리지 않는다.

## 출처

- https://supabase.com/docs/guides/storage/security/access-control
- https://supabase.com/docs/guides/storage/buckets/fundamentals
- https://supabase.com/docs/guides/storage/schema/helper-functions
- https://supabase.com/docs/guides/storage/uploads/file-limits
- https://supabase.com/docs/guides/storage/management/delete-objects
- https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions
- https://vercel.com/docs/functions/limitations
