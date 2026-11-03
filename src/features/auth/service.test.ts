import { beforeEach, describe, expect, it, vi } from "vitest";

const signInWithPassword = vi.fn();
const signOut = vi.fn();

vi.mock("@/features/auth/repository", () => ({
  signInWithPassword: (...args: unknown[]) => signInWithPassword(...args),
  signOut: (...args: unknown[]) => signOut(...args),
}));

const { login, logout } = await import("@/features/auth/service");

const supabase = {} as never;
const admin = {
  id: "a1",
  email: "admin@sinarberkah.com",
  app_metadata: { role: "admin" },
};
const user = {
  id: "u1",
  email: "user@sinarberkah.com",
  app_metadata: {},
  user_metadata: { role: "admin" },
};

beforeEach(() => {
  signInWithPassword.mockReset();
  signOut.mockReset().mockResolvedValue(null);
});

describe("login: validasi", () => {
  it("email tidak valid ditolak sebelum memanggil Supabase", async () => {
    await expect(
      login(supabase, { email: "bukan-email", password: "x" }),
    ).rejects.toMatchObject({
      name: "ZodError",
    });
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("password kosong ditolak", async () => {
    await expect(
      login(supabase, { email: "admin@sinarberkah.com", password: "" }),
    ).rejects.toMatchObject({
      name: "ZodError",
    });
  });

  it("email dirapikan (spasi dan huruf besar) sebelum dikirim", async () => {
    signInWithPassword.mockResolvedValue({ user: admin, error: null });
    await login(supabase, {
      email: "  Admin@SinarBerkah.com ",
      password: "rahasia",
    });
    expect(signInWithPassword).toHaveBeenCalledWith(
      supabase,
      "admin@sinarberkah.com",
      "rahasia",
    );
  });
});

describe("login: otorisasi", () => {
  it("admin berhasil login", async () => {
    signInWithPassword.mockResolvedValue({ user: admin, error: null });
    await expect(
      login(supabase, { email: admin.email, password: "rahasia" }),
    ).resolves.toEqual({
      email: admin.email,
    });
    expect(signOut).not.toHaveBeenCalled();
  });

  it("kredensial salah = UNAUTHENTICATED dengan pesan umum", async () => {
    signInWithPassword.mockResolvedValue({
      user: null,
      error: { code: "invalid_credentials" },
    });
    await expect(
      login(supabase, { email: admin.email, password: "salah" }),
    ).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
      message: "Email atau password salah.",
    });
  });

  it("user bukan admin (role di user_metadata tidak dihitung) = FORBIDDEN dan sesi dibuang", async () => {
    signInWithPassword.mockResolvedValue({ user, error: null });
    await expect(
      login(supabase, { email: user.email, password: "rahasia" }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(signOut).toHaveBeenCalledOnce();
  });
});

describe("logout", () => {
  it("berhasil", async () => {
    await expect(logout(supabase)).resolves.toEqual({ loggedOut: true });
  });

  it("gagal di Supabase = INTERNAL", async () => {
    signOut.mockResolvedValue(new Error("network"));
    await expect(logout(supabase)).rejects.toMatchObject({ code: "INTERNAL" });
  });
});
