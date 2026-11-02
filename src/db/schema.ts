import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const ARTICLE_TYPES = ["berita", "artikel", "postingan"] as const;
export const ARTICLE_STATUSES = ["draft", "published"] as const;

export const articleTypeEnum = pgEnum("article_type", ARTICLE_TYPES);
export const articleStatusEnum = pgEnum("article_status", ARTICLE_STATUSES);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** Admin accounts for the CMS. */
export const admins = pgTable("admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 254 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  ...timestamps,
});

/**
 * Berita (news), artikel (articles) and postingan (posts) share one table; `type`
 * tells them apart. The public site's "Berita" pages read type = 'berita'.
 */
export const articles = pgTable(
  "articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 200 }).notNull().unique(),
    type: articleTypeEnum("type").notNull().default("berita"),
    title: varchar("title", { length: 200 }).notNull(),
    excerpt: varchar("excerpt", { length: 300 }),
    content: text("content").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    author: varchar("author", { length: 80 }).notNull().default("Admin"),
    status: articleStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("articles_listing_idx").on(t.type, t.status, t.publishedAt),
    index("articles_created_idx").on(t.createdAt),
  ],
);

/** Photos shown in "Galeri Desa". Lower sort_order comes first; ties: newest first. */
export const galleryImages = pgTable(
  "gallery_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    url: text("url").notNull(),
    alt: varchar("alt", { length: 200 }).notNull(),
    caption: varchar("caption", { length: 300 }),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("gallery_order_idx").on(t.sortOrder, t.createdAt)],
);

export type Admin = typeof admins.$inferSelect;
export type ArticleRow = typeof articles.$inferSelect;
export type NewArticleRow = typeof articles.$inferInsert;
export type GalleryImageRow = typeof galleryImages.$inferSelect;
