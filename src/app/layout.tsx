import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Fira_Code, Fira_Sans } from "next/font/google";

const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-fira-sans",
});
const firaCode = Fira_Code({ subsets: ["latin"], display: "swap", variable: "--font-fira-code" });

export const metadata: Metadata = {
  title: { default: "Admin Desa Pendil", template: "%s | Admin Desa Pendil" },
  description: "Panel pengelolaan konten website Desa Pendil.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F0A400" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${firaSans.variable} ${firaCode.variable}`}>
      <body className="min-h-dvh bg-canvas font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
