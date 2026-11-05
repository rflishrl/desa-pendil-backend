-- Mengisi published_at saat artikel pertama kali diterbitkan, supaya tampil di
-- urutan terbaru tanpa aplikasi harus menghitungnya. Berlaku untuk insert dan update.

create or replace function private.set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger articles_set_published_at
  before insert or update on public.articles
  for each row execute function private.set_published_at();
