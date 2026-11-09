import { z } from "zod";

/** Shared validation schema for login form (client) and POST route (server). */
export const loginSchema = z.object({
  // Dirapikan dulu (spasi, huruf besar), baru dicek formatnya.
  email: z.string().trim().toLowerCase().pipe(z.email("Email tidak valid.")),
  password: z.string().min(1, "Password wajib diisi.").max(200),
  turnstileToken: z.string().trim().min(1, "Verifikasi keamanan diperlukan."),
});

export type LoginInput = z.input<typeof loginSchema>;

export interface LoginResult {
  email: string;
}
