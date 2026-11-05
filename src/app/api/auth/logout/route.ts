import { logout } from "@/features/auth/service";
import { withApi } from "@/lib/api/with-api";

export const maxDuration = 10;

export const POST = withApi({ access: "session" }, async () => ({
  data: await logout(),
}));
