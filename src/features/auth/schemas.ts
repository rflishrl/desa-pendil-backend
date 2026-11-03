import { z } from "zod";

/** Dipakai bersama form login (client) dan route POST /api/auth/login (server). */
export const loginSchema = z.object({
  // Dirapikan dulu (spasi, huruf besar), baru dicek formatnya.
  email: z.string().trim().toLowerCase().pipe(z.email("Email tidak valid.")),
  password: z.string().min(1, "Password wajib diisi.").max(200),
});

export type LoginInput = z.input<typeof loginSchema>;

export interface LoginResult {
  email: string;
}
