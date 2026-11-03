/** Tipe bersama server dan client. Tidak boleh mengimpor modul server di sini. */

export interface RevalidateStatus {
  /** Alamat frontend yang dipakai backend, atau `null` jika belum diisi. Bukan rahasia. */
  frontendUrl: string | null;
  /** Hanya ya atau tidak. Nilai rahasianya tidak pernah dikirim ke browser. */
  hasSecret: boolean;
}

export type RevalidateCheckState =
  | "ok"
  | "not_configured"
  | "unauthorized"
  | "frontend_missing_secret"
  | "wrong_address"
  | "unreachable"
  | "error";

export interface RevalidateCheck {
  state: RevalidateCheckState;
  /** Kalimat yang bisa langsung dibaca admin, lengkap dengan langkah perbaikannya. */
  message: string;
}
