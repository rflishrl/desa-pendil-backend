import { createFileRoute, redirect } from "@tanstack/react-router";

import { ThemeToggle } from "@/components/admin-kit/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/login-form";
import { getAuthAdmin } from "@/features/auth/server-fn";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const admin = await getAuthAdmin();
    if (admin) {
      throw redirect({ to: "/admin" });
    }
  },
  head: () => ({
    meta: [{ title: "Masuk | Panel Admin Desa Pendil" }],
  }),
  component: LoginComponent,
});

function LoginComponent() {
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
