-- The avatars bucket (20260813031103) omitted a select policy, reasoning
-- that public reads bypass RLS via the public object endpoint. But
-- upload(..., { upsert: true }) needs to SELECT first to decide whether
-- it's inserting or updating, which fails under RLS without this policy —
-- confirmed via a real upload attempt ("new row violates row-level
-- security policy").

create policy "individuals can view own avatar via api"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
