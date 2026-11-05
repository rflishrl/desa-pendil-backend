import type { CollectionConfig } from "payload";

export const Services: CollectionConfig = {
  slug: "services",
  labels: {
    singular: "Layanan Desa",
    plural: "Layanan Desa",
  },
  admin: {
    useAsTitle: "namaLayanan",
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => user?.role === "admin",
  },
  fields: [
    {
      name: "namaLayanan",
      type: "text",
      label: "Nama Layanan Surat / Pengurusan",
      required: true,
    },
    {
      name: "deskripsi",
      type: "textarea",
      label: "Deskripsi & Prosedur",
      required: true,
    },
    {
      name: "persyaratan",
      type: "array",
      label: "Daftar Dokumen Persyaratan",
      labels: {
        singular: "Syarat",
        plural: "Syarat-Syarat",
      },
      fields: [
        {
          name: "syarat",
          type: "text",
          label: "Nama Dokumen / Syarat",
          required: true,
        },
      ],
    },
  ],
};
