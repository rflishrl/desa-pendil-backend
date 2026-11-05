import { logout } from "@/features/auth/service";
import { withApi } from "@/lib/api/with-api";

export const maxDuration = 10;

// Cek Origin (bawaan withApi) mencegah situs lain mengeluarkan admin diam-diam.
export const POST = withApi({ access: "session" }, async ({ supabase }) => ({
  data: await logout(supabase),
}));
