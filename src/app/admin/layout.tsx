import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin-kit/admin-shell";
import { getCurrentAdmin } from "@/lib/auth/session";

// Admin pages depend on session cookies and must remain dynamic.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Checks token via Supabase Auth; non-admin users redirect to login.
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");

  const frontendUrl =
    process.env.FRONTEND_URL &&
    process.env.FRONTEND_URL !== "http://localhost:3000"
      ? process.env.FRONTEND_URL
      : "https://desa-pendil.vercel.app/";

  return (
    <AdminShell email={admin.email} frontendUrl={frontendUrl}>
      {children}
    </AdminShell>
  );
}
