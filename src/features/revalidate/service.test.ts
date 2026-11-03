import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();
const admin = {
  id: "a1",
  email: "admin@sinarberkah.com",
  role: "admin" as const,
};
const user = { id: "u1", email: "user@sinarberkah.com", role: "user" as const };

const { checkRevalidate, getRevalidateStatus } =
  await import("@/features/revalidate/service");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("FRONTEND_URL", "https://frontend.example.com/");
  vi.stubEnv("REVALIDATE_SECRET", "rahasia-uji-123");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  fetchMock.mockReset();
});

describe("getRevalidateStatus", () => {
  it("menampilkan alamat tanpa garis miring dan hanya status rahasia", () => {
    const status = getRevalidateStatus(admin);
    expect(status).toEqual({
      frontendUrl: "https://frontend.example.com",
      hasSecret: true,
    });
    expect(JSON.stringify(status)).not.toContain("rahasia-uji-123");
  });

  it("melaporkan yang kosong, termasuk yang hanya berisi spasi", () => {
    vi.stubEnv("FRONTEND_URL", "   ");
    vi.stubEnv("REVALIDATE_SECRET", "");
    expect(getRevalidateStatus(admin)).toEqual({
      frontendUrl: null,
      hasSecret: false,
    });
  });

  it("hanya untuk admin", () => {
    expect(() => getRevalidateStatus(user)).toThrowError(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
    expect(() => getRevalidateStatus(null)).toThrowError(
      expect.objectContaining({ code: "UNAUTHENTICATED" }),
    );
  });
});

describe("checkRevalidate", () => {
  it("berhasil: memanggil frontend dengan rahasia dan tag berita", async () => {
    fetchMock.mockResolvedValue(json({ revalidated: ["news"] }));
    const result = await checkRevalidate(admin);

    expect(result.state).toBe("ok");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://frontend.example.com/api/revalidate");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).authorization).toBe(
      "Bearer rahasia-uji-123",
    );
    expect(JSON.parse(init.body as string)).toEqual({ tags: ["news"] });
  });

  it("pesan hasil tidak membocorkan rahasia", async () => {
    fetchMock.mockResolvedValue(json({ error: "x" }, 401));
    const result = await checkRevalidate(admin);
    expect(JSON.stringify(result)).not.toContain("rahasia-uji-123");
  });

  it("200 tanpa tag yang dikenali dianggap bermasalah", async () => {
    fetchMock.mockResolvedValue(json({ revalidated: [] }));
    expect((await checkRevalidate(admin)).state).toBe("error");
  });

  it("401: rahasia berbeda", async () => {
    fetchMock.mockResolvedValue(json({ error: "Tidak diizinkan." }, 401));
    const result = await checkRevalidate(admin);
    expect(result.state).toBe("unauthorized");
    expect(result.message).toContain("berbeda");
  });

  it("503: frontend belum punya rahasia", async () => {
    fetchMock.mockResolvedValue(json({ error: "belum diisi" }, 503));
    expect((await checkRevalidate(admin)).state).toBe(
      "frontend_missing_secret",
    );
  });

  it("404: alamat salah", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 404 }));
    const result = await checkRevalidate(admin);
    expect(result.state).toBe("wrong_address");
    expect(result.message).toContain("https://frontend.example.com");
  });

  it("jaringan gagal: tidak terjangkau", async () => {
    fetchMock.mockRejectedValue(new Error("getaddrinfo ENOTFOUND"));
    const result = await checkRevalidate(admin);
    expect(result.state).toBe("unreachable");
    expect(result.message).toContain("ENOTFOUND");
  });

  it("variabel kosong: tidak memanggil jaringan, menyebut nama yang kosong", async () => {
    vi.stubEnv("REVALIDATE_SECRET", "");
    const result = await checkRevalidate(admin);
    expect(result.state).toBe("not_configured");
    expect(result.message).toContain("REVALIDATE_SECRET");
    expect(result.message).not.toContain("FRONTEND_URL dan");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("dua variabel kosong: menyebut keduanya", async () => {
    vi.stubEnv("FRONTEND_URL", "");
    vi.stubEnv("REVALIDATE_SECRET", "");
    const result = await checkRevalidate(admin);
    expect(result.message).toContain("FRONTEND_URL dan REVALIDATE_SECRET");
  });

  it("bukan admin: ditolak sebelum menyentuh jaringan", async () => {
    await expect(checkRevalidate(user)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
