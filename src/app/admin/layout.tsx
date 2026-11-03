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

  return <AdminShell email={admin.email}>{children}</AdminShell>;
}
