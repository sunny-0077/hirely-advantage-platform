export function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/.test(value) || value.startsWith("/auth")) return "/app";
  return value;
}
const PUBLIC_APP_URL = "https://hirely-advantage-platform.lovable.app";

/** Email links must open a public address; the editor preview requires a Lovable login. */
export function authRedirectUrl(origin: string = window.location.origin): string {
  const host = new URL(origin).hostname;
  const isPrivatePreview = host.startsWith("id-preview--") || host.endsWith(".lovableproject.com") || host === "localhost" || host === "127.0.0.1";
  return `${isPrivatePreview ? PUBLIC_APP_URL : origin}/auth/callback`;
}
