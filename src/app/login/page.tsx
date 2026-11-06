import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ThemeToggle } from "@/components/admin-kit/theme-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/login-form";
import { getCurrentAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Masuk" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentAdmin()) redirect("/admin");

  return (
    <main
      id="main-content"
      className="relative flex min-h-dvh items-center justify-center bg-background px-4 py-10 transition-colors"
    >
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md border-border/80 bg-card shadow-lg">
        <CardHeader className="space-y-3 pb-6">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand font-heading text-lg font-extrabold text-ink shadow-xs"
            >
              DP
            </span>
            <div>
              <CardTitle className="font-heading text-xl font-extrabold tracking-wide text-foreground uppercase">
                Desa Pendil
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Masuk ke panel admin
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
