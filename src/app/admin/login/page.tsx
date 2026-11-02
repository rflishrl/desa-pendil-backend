import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-card sm:p-8">
        <p className="text-lg font-black text-primary-700">Desa Pendil</p>
        <h1 className="mt-1 text-2xl font-bold">Masuk ke panel admin</h1>
        <p className="mb-6 mt-1 text-muted">Kelola berita, artikel, postingan, dan galeri.</p>
        <LoginForm next={next ?? "/admin"} />
      </div>
    </main>
  );
}
