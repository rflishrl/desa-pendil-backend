import type { CollectionConfig } from "payload";
import { compressUploadedImage } from "../utilities/compressImage";

export const Media: CollectionConfig = {
  slug: "media",
  labels: {
    singular: "Media",
    plural: "Galeri Berkas",
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => Boolean(user),
    delete: ({ req: { user } }) => Boolean(user),
  },
  hooks: {
    beforeOperation: [
      async ({ args, operation, req }) => {
        if ((operation === "create" || operation === "update") && req.file) {
          const compressed = await compressUploadedImage(req.file, {
            quality: 85,
            maxDimension: 2560,
          });
          req.file.data = compressed.data;
          req.file.size = compressed.size;
          req.file.mimetype = compressed.mimetype;
          req.file.name = compressed.name;
        }
        return args;
      },
    ],
  },
  upload: {
    formatOptions: {
      format: "webp",
      options: { quality: 85 },
    },
    mimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
      "application/pdf",
    ],
    imageSizes: [
      {
        name: "thumbnail",
        width: 300,
        height: 300,
        position: "centre",
        formatOptions: {
          format: "webp",
          options: { quality: 85 },
        },
      },
      {
        name: "card",
        width: 768,
        height: 432,
        position: "centre",
        formatOptions: {
          format: "webp",
          options: { quality: 85 },
        },
      },
      {
        name: "hero",
        width: 1440,
        height: 810,
        position: "centre",
        formatOptions: {
          format: "webp",
          options: { quality: 85 },
        },
      },
    ],
    adminThumbnail: "thumbnail",
  },
  fields: [
    {
      name: "alt",
      type: "text",
      label: "Deskripsi Alternatif (Alt Text)",
      required: true,
    },
  ],
};
