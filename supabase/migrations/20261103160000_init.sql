-- Skema awal Desa Pendil di Supabase: tabel, index, RLS, dan fungsi RPC.
--
-- Aturan akses (RLS):
-- - Publik (anon) dan user biasa hanya boleh MEMBACA konten berstatus 'published'
--   dan semua foto galeri.
-- - Hanya admin yang boleh menulis dan membaca draft. Admin = user dengan
--   app_metadata.role = 'admin'. app_metadata hanya bisa diubah dengan secret key,
--   jadi user tidak bisa menjadikan dirinya admin.
-- - Tabel penghitung rate limit ada di skema `private`, yang tidak dibuka lewat Data API.

create extension if not exists pg_trgm with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- --- Kolom updated_at otomatis ----------------------------------------------

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- --- Artikel (berita, artikel, postingan) --------------------------------------

create type public.article_type as enum ('berita', 'artikel', 'postingan');
create type public.article_status as enum ('draft', 'published');

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug varchar(200) not null unique,
  type public.article_type not null default 'berita',
  title varchar(200) not null,
  excerpt varchar(300),
  content text not null,
  thumbnail_url text,
  author varchar(80) not null default 'Admin',
  status public.article_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index articles_listing_idx on public.articles (type, status, published_at desc);
create index articles_created_at_idx on public.articles (created_at desc);
create index articles_title_trgm_idx
  on public.articles using gin (title extensions.gin_trgm_ops);

create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function private.set_updated_at();

-- --- Galeri ---------------------------------------------------------------------
-- sort_order kecil tampil lebih dulu; jika sama, yang terbaru dulu.

create table public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  alt varchar(200) not null,
  caption varchar(300),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index gallery_images_order_idx
  on public.gallery_images (sort_order, created_at desc);

create trigger gallery_images_set_updated_at
  before update on public.gallery_images
  for each row execute function private.set_updated_at();

-- --- Hak akses tabel -----------------------------------------------------------

revoke all on public.articles, public.gallery_images from anon, authenticated;
grant select on public.articles, public.gallery_images to anon, authenticated;
grant insert, update, delete on public.articles, public.gallery_images to authenticated;
grant all on public.articles, public.gallery_images to service_role;

-- --- RLS -----------------------------------------------------------------------

alter table public.articles enable row level security;
alter table public.gallery_images enable row level security;

create policy "Semua orang membaca artikel terbit, admin membaca semua"
  on public.articles for select to anon, authenticated
  using (
    status = 'published'
    or coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin'
  );

create policy "Admin menambah artikel"
  on public.articles for insert to authenticated
  with check (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin');

create policy "Admin mengubah artikel"
  on public.articles for update to authenticated
  using (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin')
  with check (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin');

create policy "Admin menghapus artikel"
  on public.articles for delete to authenticated
  using (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin');

create policy "Semua orang membaca galeri"
  on public.gallery_images for select to anon, authenticated
  using (true);

create policy "Admin menambah foto galeri"
  on public.gallery_images for insert to authenticated
  with check (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin');

create policy "Admin mengubah foto galeri"
  on public.gallery_images for update to authenticated
  using (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin')
  with check (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin');

create policy "Admin menghapus foto galeri"
  on public.gallery_images for delete to authenticated
  using (coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin');

-- --- RPC: daftar dan jumlah artikel (pencarian aman) -----------------------------
-- `security invoker`, jadi RLS pemanggil tetap berlaku: anon hanya melihat 'published'.
-- Karakter khusus LIKE (\ % _) diloloskan, jadi kata kunci dibaca sebagai teks biasa.
-- Urutan: terbit terbaru dulu (published_at), lalu dibuat terbaru.

create or replace function public.list_articles(
  p_type public.article_type default null,
  p_status public.article_status default null,
  p_q text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns setof public.articles
language sql
stable
security invoker
set search_path = ''
as $$
  with params as (
    select '%' || replace(replace(replace(coalesce(p_q, ''), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
  )
  select a.*
  from public.articles a, params
  where (p_type is null or a.type = p_type)
    and (p_status is null or a.status = p_status)
    and (coalesce(p_q, '') = '' or a.title ilike params.pattern)
  order by coalesce(a.published_at, a.created_at) desc, a.id
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$$;

create or replace function public.count_articles(
  p_type public.article_type default null,
  p_status public.article_status default null,
  p_q text default null
)
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  with params as (
    select '%' || replace(replace(replace(coalesce(p_q, ''), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
  )
  select count(*)::integer
  from public.articles a, params
  where (p_type is null or a.type = p_type)
    and (p_status is null or a.status = p_status)
    and (coalesce(p_q, '') = '' or a.title ilike params.pattern);
$$;

-- --- RPC: ubah artikel dengan baris terkunci ------------------------------------
-- Baris dikunci (FOR UPDATE), jadi `previous_thumbnail_url` selalu gambar yang
-- benar-benar diganti. Kunci yang tidak ada di `p_patch` tidak diubah.
-- Nilai JSON null pada `excerpt` / `thumbnail_url` / `published_at` menghapus nilainya.

create or replace function public.update_article(p_id uuid, p_patch jsonb)
returns table (
  previous_thumbnail_url text,
  id uuid,
  slug varchar,
  type public.article_type,
  title varchar,
  excerpt varchar,
  content text,
  thumbnail_url text,
  author varchar,
  status public.article_status,
  published_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_previous text;
begin
  select a.thumbnail_url into v_previous
  from public.articles a
  where a.id = p_id
  for update;

  if not found then
    return;
  end if;

  return query
  update public.articles a
  set
    slug = coalesce(p_patch ->> 'slug', a.slug),
    type = coalesce((p_patch ->> 'type')::public.article_type, a.type),
    title = coalesce(p_patch ->> 'title', a.title),
    excerpt = case when p_patch ? 'excerpt' then p_patch ->> 'excerpt' else a.excerpt end,
    content = coalesce(p_patch ->> 'content', a.content),
    thumbnail_url = case when p_patch ? 'thumbnail_url' then p_patch ->> 'thumbnail_url' else a.thumbnail_url end,
    author = coalesce(p_patch ->> 'author', a.author),
    status = coalesce((p_patch ->> 'status')::public.article_status, a.status),
    published_at = case when p_patch ? 'published_at' then (p_patch ->> 'published_at')::timestamptz else a.published_at end
  where a.id = p_id
  returning
    v_previous,
    a.id,
    a.slug,
    a.type,
    a.title,
    a.excerpt,
    a.content,
    a.thumbnail_url,
    a.author,
    a.status,
    a.published_at,
    a.created_at,
    a.updated_at;
end;
$$;

-- --- Rate limit (hanya server dengan secret key) ------------------------------------

create table private.rate_limits (
  key varchar(200) primary key,
  count integer not null,
  reset_at timestamptz not null
);

-- Satu perintah INSERT ... ON CONFLICT, jadi aman dipanggil bersamaan dan berlaku di
-- semua instance serverless. Waktu memakai jam database.
create or replace function public.rate_limit_hit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, retry_after_seconds integer)
language sql
volatile
security definer
set search_path = ''
as $$
  insert into private.rate_limits as r (key, count, reset_at)
  values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update
  set
    count = case when r.reset_at <= now() then 1 else r.count + 1 end,
    reset_at = case when r.reset_at <= now() then excluded.reset_at else r.reset_at end
  returning
    r.count <= p_limit,
    case
      when r.count <= p_limit then 0
      else greatest(0, ceil(extract(epoch from r.reset_at - now())))::integer
    end;
$$;

-- Menghapus penghitung `p_key` (mis. setelah login berhasil) dan penghitung lain yang
-- sudah kedaluwarsa lebih dari sehari, supaya tabel tidak menumpuk.
create or replace function public.rate_limit_reset(p_key text)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  delete from private.rate_limits
  where key = p_key or reset_at < now() - interval '1 day';
$$;

-- --- Hak menjalankan fungsi ------------------------------------------------------------
-- Postgres memberi EXECUTE ke PUBLIC secara bawaan; dicabut lalu diberikan seperlunya.

revoke execute on function
  public.list_articles(public.article_type, public.article_status, text, integer, integer),
  public.count_articles(public.article_type, public.article_status, text),
  public.update_article(uuid, jsonb),
  public.rate_limit_hit(text, integer, integer),
  public.rate_limit_reset(text)
from public, anon, authenticated;

grant execute on function
  public.list_articles(public.article_type, public.article_status, text, integer, integer),
  public.count_articles(public.article_type, public.article_status, text)
to anon, authenticated;

grant execute on function public.update_article(uuid, jsonb) to authenticated;

grant execute on function
  public.rate_limit_hit(text, integer, integer),
  public.rate_limit_reset(text)
to service_role;
