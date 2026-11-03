import { describe, expect, it } from "vitest";
import { authRedirectUrl, isVerifiedSignup, safeReturnPath } from "./authNavigation";

describe("sign-in destinations", () => {
  it("keeps a dashboard destination", () => expect(safeReturnPath("/app/hiring")).toBe("/app/hiring"));
  it("rejects external destinations", () => expect(safeReturnPath("//example.com")).toBe("/app"));
  it("rejects backslash host escapes", () => expect(safeReturnPath("/\\example.com")).toBe("/app"));
});

describe("email verification", () => {
  it("opens Hirely instead of the private editor", () => {
    expect(authRedirectUrl("https://id-preview--1e301b91-dc24-4d7f-a6fe-5ba924a25bc1.lovable.app")).toBe("https://hirely-advantage-platform.lovable.app/auth/callback?verification=signup");
  });
  it("keeps a public Hirely origin", () => {
    expect(authRedirectUrl("https://hirely-advantage-platform.lovable.app")).toBe("https://hirely-advantage-platform.lovable.app/auth/callback?verification=signup");
  });
  it("only acknowledges server-confirmed signup email", () => {
    expect(isVerifiedSignup("signup", { email_confirmed_at: "2026-11-03T11:09:00Z" })).toBe(true);
    expect(isVerifiedSignup("signup", { email_confirmed_at: null })).toBe(false);
    expect(isVerifiedSignup("signup", null)).toBe(false);
    expect(isVerifiedSignup(null, { email_confirmed_at: "2026-11-03T11:09:00Z" })).toBe(false);
  });
});