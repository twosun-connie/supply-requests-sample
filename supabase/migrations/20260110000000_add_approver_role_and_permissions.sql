-- 담당자 역할과 신청·품목 권한 코드를 더한다. 새 enum 값은 이 파일에서 쓰지 않는다(다음 파일에서 쓴다).
alter type public.app_role add value 'approver';
alter type public.app_permission add value 'requests.approve';
alter type public.app_permission add value 'items.manage';
