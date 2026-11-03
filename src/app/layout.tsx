import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";

import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Panel Admin | Desa Pendil",
    template: "%s | Panel Admin Desa Pendil",
  },
  description: "Kelola berita, artikel, postingan, dan galeri Desa Pendil.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#221c1c",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={cn(montserrat.variable)}>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
        >
          Lewati ke konten utama
        </a>
        <QueryProvider>{children}</QueryProvider>
        {/* Panel admin selalu terang, jadi toast tidak mengikuti tema sistem. */}
        <Toaster theme="light" richColors closeButton position="top-right" />
      </body>
    </html>
  );
}
