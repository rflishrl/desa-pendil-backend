import { createFileRoute, isRedirect, Outlet, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { AdminShell } from "@/components/admin-kit/admin-shell";
import { getCurrentAdmin } from "@/lib/auth/session";

export const getAdminLayoutData = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return null;
    const frontendUrl =
      process.env.FRONTEND_URL && process.env.FRONTEND_URL !== "http://localhost:3000"
        ? process.env.FRONTEND_URL
        : "https://desa-pendil.vercel.app/";
    return { admin, frontendUrl };
  } catch {
    return null;
  }
});

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    try {
      const data = await getAdminLayoutData();
      if (!data?.admin) {
        throw redirect({ to: "/login" });
      }
      return data;
    } catch (err) {
      if (isRedirect(err)) throw err;
      throw redirect({ to: "/login" });
    }
  },
  component: AdminLayoutComponent,
});

function AdminLayoutComponent() {
  const { admin, frontendUrl } = Route.useRouteContext();
  return (
    <AdminShell email={admin.email} frontendUrl={frontendUrl}>
      <Outlet />
    </AdminShell>
  );
}
