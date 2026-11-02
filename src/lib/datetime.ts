const JAKARTA = "Asia/Jakarta";

const display = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: JAKARTA,
});

export function formatDateTime(date: Date | null | undefined): string {
  return date ? `${display.format(date)} WIB` : "-";
}

/** Date -> "YYYY-MM-DDTHH:mm" in Jakarta time, for <input type="datetime-local">. */
export function toLocalInput(date: Date | null | undefined): string {
  if (!date) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: JAKARTA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** The admin types Jakarta time; the server (UTC on Vercel) must not guess a zone. */
export function fromLocalInput(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string" || value === "") return undefined;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? `${value}:00+07:00` : value;
}
