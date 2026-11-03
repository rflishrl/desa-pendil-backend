import type { CookieOptions, CookieOptionsWithName } from "@supabase/ssr";

/** Admin sessions last 7 days. The proxy renews the cookie while the admin stays active. */
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/**
 * Cookie settings for the Supabase session. Used by both the server client and the proxy,
 * so login, refresh and logout all write the cookie the same way.
 *
 * - httpOnly: scripts in the page cannot read the session. Safe here because the browser
 *   never talks to Supabase; login and logout run on the server.
 * - secure: the cookie is only sent over HTTPS. Off in development so http://localhost works.
 * - sameSite lax: the cookie is not sent on cross-site POST requests.
 *
 * `maxAge` is not set here: @supabase/ssr overwrites it with 400 days on every write.
 * Pass the options of each cookie through `withSessionLifetime` in `setAll` instead.
 */
export const SESSION_COOKIE_OPTIONS: CookieOptionsWithName = {
  path: "/",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
};

/**
 * Shortens the lifetime of a cookie that is being written. A cookie being deleted
 * (`maxAge` 0) is left alone.
 */
export function withSessionLifetime(options: CookieOptions): CookieOptions {
  if (options.maxAge === 0) return options;
  return { ...options, maxAge: SESSION_MAX_AGE_SECONDS };
}
