import { SearchIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * GET form search input, functioning with or without JavaScript.
 * Stacks vertically on mobile viewports; flexes inline on larger viewports.
 */
export function SearchForm({
  defaultValue,
  placeholder,
  clearHref,
}: {
  defaultValue: string;
  placeholder: string;
  /** URL href resetting query parameters. */
  clearHref: string;
}) {
  return (
    <form
      role="search"
      className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <div className="relative w-full sm:max-w-md">
        <label htmlFor="q" className="sr-only">
          Cari
        </label>
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id="q"
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder={placeholder}
          autoComplete="off"
          className="h-11 bg-card pl-10 text-base"
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="submit"
          size="lg"
          className="h-11 flex-1 px-4 sm:flex-none"
        >
          Cari
        </Button>
        {defaultValue && (
          <Button asChild variant="outline" size="lg" className="h-11 px-4">
            <Link href={clearHref}>Hapus pencarian</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
