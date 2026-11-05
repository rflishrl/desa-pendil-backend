import type { CollectionConfig } from "payload";
import { formatSlug } from "../utilities/formatSlug";

export const News: CollectionConfig = {
  slug: "news",
  labels: {
    singular: "Berita",
    plural: "Berita",
  },
  admin: {
    useAsTitle: "judul",
    defaultColumns: ["judul", "tanggalTerbit", "status"],
  },
  access: {
    read: ({ req: { user } }) => {
      if (user) return true;
      return {
        status: {
          equals: "published",
        },
      };
    },
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => user?.role === "admin",
  },
  fields: [
    {
      name: "judul",
      type: "text",
      label: "Judul Berita",
      required: true,
    },
    {
      name: "slug",
      type: "text",
      label: "Tautan URL (Slug)",
      required: true,
      unique: true,
      index: true,
      admin: {
        position: "sidebar",
      },
      hooks: {
        beforeValidate: [formatSlug("judul")],
      },
    },
    {
      name: "gambarUtama",
      type: "upload",
      relationTo: "media",
      label: "Foto / Gambar Utama",
      required: true,
    },
    {
      name: "konten",
      type: "richText",
      label: "Isi Berita",
      required: true,
    },
    {
      name: "tanggalTerbit",
      type: "date",
      label: "Tanggal Terbit",
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: {
        position: "sidebar",
        date: {
          pickerAppearance: "dayAndTime",
        },
      },
    },
    {
      name: "status",
      type: "select",
      label: "Status Publikasi",
      defaultValue: "draft",
      required: true,
      options: [
        { label: "Draf (Belum Terbit)", value: "draft" },
        { label: "Terbit (Publik)", value: "published" },
      ],
      admin: {
        position: "sidebar",
      },
    },
  ],
};
