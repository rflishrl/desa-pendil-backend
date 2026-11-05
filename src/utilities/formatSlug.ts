import type { FieldHook } from "payload";

const format = (val: string): string =>
  val
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const formatSlug =
  (fallbackField: string): FieldHook =>
  ({ data, operation, originalDoc, value }) => {
    if (typeof value === "string" && value.length > 0) {
      return format(value);
    }
    if (operation === "create" || !originalDoc?.slug) {
      const fallbackData = data?.[fallbackField] || originalDoc?.[fallbackField];
      if (typeof fallbackData === "string") {
        return format(fallbackData);
      }
    }
    return value;
  };
