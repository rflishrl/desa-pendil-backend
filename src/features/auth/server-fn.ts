import { createServerFn } from "@tanstack/react-start";
import { getCurrentAdmin } from "@/lib/auth/session";

export const getAuthAdmin = createServerFn({ method: "GET" }).handler(async () => {
  return await getCurrentAdmin();
});
