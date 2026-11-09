import type { ErrorComponentProps } from "@tanstack/react-router";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import "@/globals.css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "color-scheme", content: "light dark" },
      { name: "theme-color", content: "#f8fafc" },
      { title: "Panel Admin | Desa Pendil" },
      {
        name: "description",
        content: "Kelola berita, artikel, postingan, dan galeri Desa Pendil.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [
      { rel: "icon", href: "/favicon.ico" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300..900;1,300..900&display=swap",
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: RootNotFound,
  errorComponent: RootError,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
        >
          Lewati ke konten utama
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>{children}</QueryProvider>
          <Toaster richColors closeButton position="top-right" />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}

function RootNotFound() {
  return (
    <RootDocument>
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <p className="text-sm font-semibold tracking-wide text-brand-strong uppercase">404</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Halaman yang Anda tuju tidak tersedia atau telah dipindahkan.
        </p>
        <div className="mt-6">
          <Button asChild>
            <a href="/admin">Kembali ke Dashboard</a>
          </Button>
        </div>
      </div>
    </RootDocument>
  );
}

function RootError({ error, reset }: ErrorComponentProps) {
  return (
    <RootDocument>
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <p className="text-sm font-semibold tracking-wide text-destructive uppercase">Error</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Terjadi kesalahan sistem
        </h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Gagal memuat halaman. Silakan coba lagi."}
        </p>
        <div className="mt-6">
          <Button onClick={reset}>Coba Lagi</Button>
        </div>
      </div>
    </RootDocument>
  );
}
