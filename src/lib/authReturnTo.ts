/** Cookie used to remember which ticket to open after OAuth (Supabase doesn't return state in hash). */
const COOKIE_NAME = "ticketingReturnTo";
const MAX_AGE_SEC = 300; // 5 min

export function setReturnToCookie(path: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(path)}; path=/; max-age=${MAX_AGE_SEC}; SameSite=Lax`;
}

export function getAndClearReturnToCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + COOKIE_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)"),
  );
  const value = match ? decodeURIComponent(match[1]) : null;
  if (value) {
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
  }
  return value;
}
