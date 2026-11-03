import { checkRevalidate } from "@/features/revalidate/service";
import { withApi } from "@/lib/api/with-api";

export const maxDuration = 10;

/** Admin: uji apakah backend bisa menyuruh frontend menyegarkan halamannya. */
export const POST = withApi({ access: "admin" }, async ({ actor }) => ({
  data: await checkRevalidate(actor),
}));
