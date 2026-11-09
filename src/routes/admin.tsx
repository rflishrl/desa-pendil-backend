import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

import { AdminShell } from "@/components/admin-kit/admin-shell";
import { getCurrentAdmin } from "@/lib/auth/session";

export const getAdminLayoutData = createServerFn({ method: "GET" }).handler(async () => {
  const admin = await getCurrentAdmin();
  if (!admin) return null;
  const frontendUrl =
    process.env.FRONTEND_URL && process.env.FRONTEND_URL !== "http://localhost:3000"
      ? process.env.FRONTEND_URL
      : "https://desa-pendil.vercel.app/";
  return { admin, frontendUrl };
});

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const data = await getAdminLayoutData();
    if (!data?.admin) {
      throw redirect({ to: "/login" });
    }
    return data;
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
