/** "Desa Pendil Raih Penghargaan!" -> "desa-pendil-raih-penghargaan" */
export function slugify(input: string): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
  return slug || "tanpa-judul";
}

export function randomSuffix(): string {
  return crypto.randomUUID().slice(0, 6);
}
