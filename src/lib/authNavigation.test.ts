import { describe, expect, it } from "vitest";
import { safeReturnPath } from "./authNavigation";

describe("sign-in destinations", () => {
  it("keeps a dashboard destination", () => expect(safeReturnPath("/app/hiring")).toBe("/app/hiring"));
  it("rejects external destinations", () => expect(safeReturnPath("//example.com")).toBe("/app"));
  it("rejects backslash host escapes", () => expect(safeReturnPath("/\\example.com")).toBe("/app"));
});