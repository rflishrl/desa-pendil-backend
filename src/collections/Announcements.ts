import type { CollectionConfig } from "payload";

export const Announcements: CollectionConfig = {
  slug: "announcements",
  labels: {
    singular: "Pengumuman",
    plural: "Pengumuman",
  },
  admin: {
    useAsTitle: "judul",
    defaultColumns: ["judul", "aktif", "updatedAt"],
  },
  access: {
    read: ({ req: { user } }) => {
      if (user) return true;
      return {
        aktif: {
          equals: true,
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
      label: "Judul Pengumuman",
      required: true,
    },
    {
      name: "isi",
      type: "textarea",
      label: "Isi Ringkas Pengumuman",
      required: true,
    },
    {
      name: "aktif",
      type: "checkbox",
      label: "Tampilkan di Beranda (Aktif)",
      defaultValue: true,
      admin: {
        position: "sidebar",
      },
    },
  ],
};
