import type { CollectionConfig } from "payload";

export const Users: CollectionConfig = {
  slug: "users",
  labels: {
    singular: "Pengguna",
    plural: "Pengguna",
  },
  auth: true,
  admin: {
    useAsTitle: "email",
    defaultColumns: ["name", "email", "role"],
  },
  access: {
    create: ({ req: { user } }) => user?.role === "admin",
    read: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => {
      if (!user) return false;
      if (user.role === "admin") return true;
      return { id: { equals: user.id } };
    },
    delete: ({ req: { user } }) => user?.role === "admin",
  },
  fields: [
    {
      name: "name",
      type: "text",
      label: "Nama Lengkap",
      required: true,
    },
    {
      name: "role",
      type: "select",
      label: "Peran",
      required: true,
      defaultValue: "editor",
      options: [
        { label: "Administrator", value: "admin" },
        { label: "Editor Berita", value: "editor" },
      ],
      access: {
        update: ({ req: { user } }) => user?.role === "admin",
      },
    },
  ],
};
