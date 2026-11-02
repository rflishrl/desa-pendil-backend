"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuFileText, LuImages, LuLayoutDashboard } from "react-icons/lu";

const items = [
  { href: "/admin", label: "Ringkasan", icon: LuLayoutDashboard, exact: true },
  { href: "/admin/articles", label: "Konten", icon: LuFileText },
  { href: "/admin/gallery", label: "Galeri", icon: LuImages },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Menu admin" className="flex gap-1 lg:flex-col">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:flex-none lg:justify-start ${
              active ? "bg-primary text-ink" : "text-ink/80 hover:bg-canvas"
            }`}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
