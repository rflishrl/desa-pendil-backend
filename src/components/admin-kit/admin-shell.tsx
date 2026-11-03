"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  ImagesIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  NewspaperIcon,
  type LucideIcon,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useLogout } from "@/features/auth/hooks";
import { cn } from "@/lib/utils";

const NAV_ITEMS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboardIcon },
  { label: "Konten", href: "/admin/articles", icon: NewspaperIcon },
  { label: "Galeri", href: "/admin/gallery", icon: ImagesIcon },
];

function isActive(pathname: string, href: string) {
  return href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Menu admin">
      <ul className="space-y-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md border-l-4 px-3 text-sm font-semibold transition-colors duration-200 motion-reduce:transition-none",
                  active
                    ? "border-brand bg-white/10 text-white"
                    : "border-transparent text-[#d2d2d2] hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="size-[22px]" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Account({ email }: { email: string }) {
  const logout = useLogout();
  const busy = logout.isPending || logout.isSuccess;
  return (
    <div className="space-y-2 border-t border-white/10 pt-4">
      <p className="truncate px-3 text-sm text-[#d2d2d2]" title={email}>
        {email}
      </p>
      <button
        type="button"
        onClick={() => logout.mutate()}
        disabled={busy}
        className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-md border-l-4 border-transparent px-3 text-sm font-semibold text-[#d2d2d2] transition-colors duration-200 hover:bg-white/5 hover:text-white disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none"
      >
        <LogOutIcon className="size-[22px]" aria-hidden="true" />
        {busy ? "Keluar..." : "Keluar"}
      </button>
    </div>
  );
}

export function AdminShell({
  email,
  children,
}: {
  email: string;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Desktop: sidebar tetap */}
      <aside className="hidden bg-ink p-5 text-white on-dark lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:justify-between">
        <div className="space-y-8">
          <Brand />
          <Nav />
        </div>
        <Account email={email} />
      </aside>

      {/* Mobile dan tablet: bar atas + menu samping (Sheet: fokus terkunci, Esc menutup) */}
      <header className="sticky top-0 z-40 bg-ink text-white on-dark lg:hidden">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <Brand />
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              className="-mr-2 inline-flex size-11 cursor-pointer items-center justify-center rounded-md"
              aria-label="Buka menu"
            >
              <MenuIcon className="size-[26px]" aria-hidden="true" />
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-72 border-white/10 bg-ink p-5 text-white on-dark"
            >
              <SheetTitle className="sr-only">Menu admin</SheetTitle>
              <SheetDescription className="sr-only">
                Pindah halaman atau keluar dari panel admin.
              </SheetDescription>
              <div className="flex h-full flex-col justify-between gap-8">
                <div className="space-y-8">
                  <Brand onNavigate={() => setMenuOpen(false)} />
                  <Nav onNavigate={() => setMenuOpen(false)} />
                </div>
                <Account email={email} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main
        id="main-content"
        className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-10"
      >
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/admin"
      onClick={onNavigate}
      className="flex items-center gap-3"
    >
      <span
        aria-hidden="true"
        className="inline-flex size-9 items-center justify-center rounded-md bg-brand font-heading text-lg font-extrabold text-ink"
      >
        DP
      </span>
      <span className="font-heading text-base leading-tight font-extrabold tracking-wide uppercase">
        Desa Pendil
        <span className="block text-xs font-semibold tracking-normal text-[#d2d2d2] normal-case">
          Panel Admin
        </span>
      </span>
    </Link>
  );
}
