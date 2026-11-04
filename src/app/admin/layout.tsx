import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin-kit/admin-shell";
import { getCurrentAdmin } from "@/lib/auth/session";

// Halaman admin bergantung pada cookie sesi, jadi tidak boleh dibuat statis.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // getUser() memeriksa token ke Supabase Auth; bukan admin = kembali ke login.
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
