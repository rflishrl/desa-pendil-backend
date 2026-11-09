import { createFileRoute, redirect } from "@tanstack/react-router";
import { getAdminLayoutData } from "@/routes/admin";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const data = await getAdminLayoutData().catch(() => null);
    if (data?.admin) {
      throw redirect({ to: "/admin" });
    }
    throw redirect({ to: "/login" });
  },
});
