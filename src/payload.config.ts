import path from "path";
import { fileURLToPath } from "url";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { s3Storage } from "@payloadcms/storage-s3";
import { buildConfig } from "payload";

import { Announcements } from "./collections/Announcements";
import { Media } from "./collections/Media";
import { News } from "./collections/News";
import { Services } from "./collections/Services";
import { Users } from "./collections/Users";
import { VillageOfficials } from "./collections/VillageOfficials";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  serverURL: process.env.SERVER_URL || "http://localhost:4000",
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: "- Admin Desa Pendil",
    },
  },
  collections: [Users, News, Announcements, VillageOfficials, Services, Media],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "SUPER_SECRET_PAYLOAD_KEY_CHANGE_IN_PRODUCTION",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || "",
    },
  }),
  plugins: [
    s3Storage({
      collections: {
        media: true,
      },
      bucket: process.env.R2_BUCKET || "",
      config: {
        endpoint: process.env.R2_ENDPOINT || "",
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
        },
        region: "auto",
      },
    }),
  ],
});
