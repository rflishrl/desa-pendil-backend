import type { ReactNode } from "react";

export const inputCls =
  "block w-full min-h-11 rounded-lg border border-line bg-white px-3 py-2 text-base text-ink placeholder:text-muted/70 transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary aria-[invalid=true]:border-danger";

const btnBase =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

export const btn = {
  primary: `${btnBase} bg-primary text-ink hover:bg-primary-600`,
  secondary: `${btnBase} border border-line bg-white text-ink hover:bg-canvas`,
  danger: `${btnBase} bg-danger text-white hover:bg-[#912018]`,
  ghost: `${btnBase} text-ink hover:bg-canvas`,
};

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Notice({ children, tone = "success" }: { children: ReactNode; tone?: "success" | "error" }) {
  const cls =
    tone === "success"
      ? "border-success/30 bg-success-50 text-success"
      : "border-danger/30 bg-danger-50 text-danger";
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm font-medium ${cls}`}>
      {children}
    </p>
  );
}

export function Badge({ tone, children }: { tone: "published" | "draft" | "neutral"; children: ReactNode }) {
  const cls = {
    published: "bg-success-50 text-success",
    draft: "bg-primary-100 text-primary-700",
    neutral: "bg-canvas text-muted",
  }[tone];
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{children}</span>;
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export const TYPE_LABEL = { berita: "Berita", artikel: "Artikel", postingan: "Postingan" } as const;
export const STATUS_LABEL = { published: "Terbit", draft: "Draf" } as const;
