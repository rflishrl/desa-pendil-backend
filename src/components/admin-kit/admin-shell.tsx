"use client";

import { Link, useLocation } from "@tanstack/react-router";
import {
  ExternalLinkIcon,
  ImagesIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  type LucideIcon,
  MoreVerticalIcon,
  NewspaperIcon,
} from "lucide-react";
import * as React from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useLogout } from "@/features/auth/hooks";
import { ThemeToggle } from "./theme-toggle";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboardIcon },
  { label: "Konten", href: "/admin/articles", icon: NewspaperIcon },
  { label: "Galeri", href: "/admin/gallery", icon: ImagesIcon },
];

function isNavActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getInitials(email: string): string {
  if (!email) return "DP";
  const namePart = email.split("@")[0] ?? "Admin";
  return namePart.slice(0, 2).toUpperCase();
}

function AdminBreadcrumbs() {
  const { pathname } = useLocation();

  const getBreadcrumbs = () => {
    if (pathname === "/admin") {
      return [{ label: "Dashboard", href: "/admin", isCurrent: true }];
    }

    const crumbs: { label: string; href?: string; isCurrent: boolean }[] = [
      { label: "Dashboard", href: "/admin", isCurrent: false },
    ];

    if (pathname.startsWith("/admin/articles")) {
      crumbs.push({
        label: "Konten",
        href: pathname === "/admin/articles" ? undefined : "/admin/articles",
        isCurrent: pathname === "/admin/articles",
      });
      if (pathname === "/admin/articles/new") {
        crumbs.push({ label: "Tambah Konten", isCurrent: true });
      } else if (pathname.endsWith("/edit")) {
        crumbs.push({ label: "Ubah Konten", isCurrent: true });
      }
    } else if (pathname.startsWith("/admin/gallery")) {
      crumbs.push({
        label: "Galeri",
        href: pathname === "/admin/gallery" ? undefined : "/admin/gallery",
        isCurrent: pathname === "/admin/gallery",
      });
      if (pathname === "/admin/gallery/new") {
        crumbs.push({ label: "Tambah Foto", isCurrent: true });
      } else if (pathname.endsWith("/edit")) {
        crumbs.push({ label: "Ubah Foto", isCurrent: true });
      }
    }

    return crumbs;
  };

  const crumbs = getBreadcrumbs();

  return (
    <Breadcrumb className="hidden sm:block">
      <BreadcrumbList>
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <React.Fragment key={`${crumb.label}-${idx}`}>
              <BreadcrumbItem>
                {crumb.isCurrent || !crumb.href ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

const DEFAULT_SITE_URL = "https://desa-pendil.vercel.app/";

function UserMenu({
  email,
  variant = "footer",
  siteUrl = DEFAULT_SITE_URL,
}: {
  email: string;
  variant?: "header" | "footer";
  siteUrl?: string;
}) {
  const logout = useLogout();
  const busy = logout.isPending || logout.isSuccess;
  const initials = getInitials(email);

  if (variant === "header") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-full"
            aria-label="Menu akun admin"
          >
            <Avatar size="sm" className="size-8">
              <AvatarFallback className="bg-brand/20 font-bold text-brand-strong">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-xs leading-none font-semibold text-foreground">Administrator</p>
              <p className="truncate text-xs leading-none text-muted-foreground" title={email}>
                {email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href={siteUrl} target="_blank" rel="noreferrer" className="cursor-pointer">
              <ExternalLinkIcon className="size-4" aria-hidden="true" />
              <span>Lihat Situs</span>
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => logout.mutate()}
            disabled={busy}
            variant="destructive"
            className="cursor-pointer"
          >
            <LogOutIcon className="size-4" aria-hidden="true" />
            <span>{busy ? "Keluar..." : "Keluar"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="w-full data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              aria-label="Menu akun"
            >
              <Avatar size="sm" className="size-8">
                <AvatarFallback className="bg-brand/20 text-xs font-bold text-brand-strong">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-sidebar-foreground">Admin</span>
                <span className="truncate text-xs text-sidebar-foreground/70" title={email}>
                  {email}
                </span>
              </div>
              <MoreVerticalIcon
                className="ml-auto size-4 text-sidebar-foreground/60"
                aria-hidden="true"
              />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" sideOffset={4} className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-xs leading-none font-semibold text-foreground">Administrator</p>
                <p className="truncate text-xs leading-none text-muted-foreground" title={email}>
                  {email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href={siteUrl} target="_blank" rel="noreferrer" className="cursor-pointer">
                <ExternalLinkIcon className="size-4" aria-hidden="true" />
                <span>Lihat Situs</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout.mutate()}
              disabled={busy}
              variant="destructive"
              className="cursor-pointer"
            >
              <LogOutIcon className="size-4" aria-hidden="true" />
              <span>{busy ? "Keluar..." : "Keluar"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AdminShell({
  email,
  frontendUrl,
  children,
}: {
  email: string;
  frontendUrl?: string;
  children: React.ReactNode;
}) {
  const { pathname } = useLocation();
  const siteUrl =
    frontendUrl && frontendUrl !== "http://localhost:3000" ? frontendUrl : DEFAULT_SITE_URL;

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border/60">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                asChild
                className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <Link to="/admin">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand font-heading text-sm font-extrabold text-ink shadow-xs">
                    DP
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-heading text-base font-extrabold text-sidebar-foreground">
                      Desa Pendil
                    </span>
                    <span className="truncate text-xs font-medium text-sidebar-foreground/65">
                      Panel Admin
                    </span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu Utama</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
                  const active = isNavActive(pathname, href);
                  return (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={label}
                        className={
                          active
                            ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-xs"
                            : "text-sidebar-foreground/80 hover:text-sidebar-foreground"
                        }
                      >
                        <Link to={href}>
                          <Icon className="size-4" aria-hidden="true" />
                          <span>{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border/60">
          <UserMenu email={email} variant="footer" siteUrl={siteUrl} />
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-md transition-colors sm:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <AdminBreadcrumbs />
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium">
              <a
                href={siteUrl}
                target="_blank"
                rel="noreferrer"
                title="Buka situs publik di tab baru"
              >
                <span className="hidden sm:inline">Lihat Situs</span>
                <span className="sm:hidden">Situs</span>
                <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
              </a>
            </Button>
            <ThemeToggle />
            <UserMenu email={email} variant="header" siteUrl={siteUrl} />
          </div>
        </header>

        <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
