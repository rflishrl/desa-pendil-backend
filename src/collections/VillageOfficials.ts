import type { CollectionConfig } from "payload";

export const VillageOfficials: CollectionConfig = {
  slug: "village-officials",
  labels: {
    singular: "Perangkat Desa",
    plural: "Perangkat Desa",
  },
  admin: {
    useAsTitle: "nama",
    defaultColumns: ["nama", "jabatan", "urutan"],
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => user?.role === "admin",
  },
  fields: [
    {
      name: "nama",
      type: "text",
      label: "Nama Lengkap & Gelar",
      required: true,
    },
    {
      name: "jabatan",
      type: "text",
      label: "Jabatan Struktural",
      required: true,
    },
    {
      name: "foto",
      type: "upload",
      relationTo: "media",
      label: "Foto Profil",
      required: false,
    },
    {
      name: "urutan",
      type: "number",
      label: "Urutan Hierarki Tampil",
      required: true,
      defaultValue: 10,
      admin: {
        step: 1,
      },
    },
  ],
};
