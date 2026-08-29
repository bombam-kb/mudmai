const SAFE_PREFIXES = [
  "/home",
  "/onboarding",
  "/vision",
  "/goals",
  "/todos",
  "/calendar",
  "/reviews",
  "/reminders",
  "/settings",
  "/privacy",
  "/pricing",
];

function decodeOnce(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Allow only same-origin app paths. Rejects `//host`, schemes, and backslashes. */
export function safeInternalPath(next: string | null | undefined, fallback = "/home") {
  if (!next) return fallback;
  const value = decodeOnce(next.trim());
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.includes("://") || value.includes("\\")) return fallback;

  const hashless = value.split("#")[0];
  const [pathOnly, query] = hashless.split("?");
  const stripped = pathOnly.replace(/^\/(th|en)(?=\/|$)/, "") || "/";
  const allowed = SAFE_PREFIXES.some(
    (prefix) => stripped === prefix || stripped.startsWith(`${prefix}/`),
  );
  if (!allowed) return fallback;
  return query ? `${pathOnly}?${query}` : pathOnly;
}
