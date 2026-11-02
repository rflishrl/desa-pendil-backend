import { LuLogOut } from "react-icons/lu";
import { logoutAction } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/auth/session";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-3 focus:font-semibold"
      >
        Lewati ke konten
      </a>

      <header className="border-b border-line bg-white lg:flex lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:block lg:px-5 lg:py-6">
          <div>
            <p className="text-lg font-black text-primary-700">Desa Pendil</p>
            <p className="hidden text-sm text-muted lg:block">Panel admin</p>
          </div>
          <form action={logoutAction} className="lg:hidden">
            <button
              type="submit"
              aria-label="Keluar"
              className="inline-flex size-11 cursor-pointer items-center justify-center rounded-lg text-ink transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <LuLogOut className="size-5" aria-hidden />
            </button>
          </form>
        </div>
        <div className="px-3 pb-3 lg:flex-1 lg:px-3 lg:pb-0">
          <AdminNav />
        </div>
        <div className="hidden border-t border-line p-4 lg:block">
          <p className="truncate text-sm text-muted" title={session.email}>
            {session.email}
          </p>
          <form action={logoutAction} className="mt-2">
            <button
              type="submit"
              className="inline-flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <LuLogOut className="size-5" aria-hidden />
              Keluar
            </button>
          </form>
        </div>
      </header>

      <main id="konten" className="min-w-0 px-4 py-6 sm:px-8 lg:py-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
