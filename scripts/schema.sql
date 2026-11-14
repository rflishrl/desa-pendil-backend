-- Schema for Desa Pendil on Neon PostgreSQL

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(200) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL DEFAULT 'berita',
  title VARCHAR(200) NOT NULL,
  excerpt VARCHAR(300),
  content TEXT NOT NULL,
  thumbnail_url TEXT,
  author VARCHAR(80) NOT NULL DEFAULT 'Admin',
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS articles_listing_idx ON articles (type, status, published_at DESC);
CREATE INDEX IF NOT EXISTS articles_created_at_idx ON articles (created_at DESC);

CREATE TABLE IF NOT EXISTS gallery_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  alt VARCHAR(200) NOT NULL,
  caption VARCHAR(300),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS gallery_images_order_idx ON gallery_images (sort_order ASC, created_at DESC);

CREATE TABLE IF NOT EXISTS rate_limits (
  key VARCHAR(255) PRIMARY KEY,
  count INT NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS media_objects (
  key VARCHAR(255) PRIMARY KEY,
  folder VARCHAR(60) NOT NULL DEFAULT '',
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  thumb_size_bytes BIGINT NOT NULL DEFAULT 0 CHECK (thumb_size_bytes >= 0),
  content_type VARCHAR(100) NOT NULL DEFAULT 'image/webp',
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS media_objects_created_at_idx ON media_objects (created_at DESC);
