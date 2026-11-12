import { describe, expect, it } from "vitest";
import { emailCredentials } from "./emailCredentials";
function form(password: string) { const data = new FormData();data.set("email", "  seeker@example.org  ");data.set("password", password);return data; }
describe("mobile email credentials", () => {
  it("reads submitted autofilled controls and trims only the email", () => {
    expect(emailCredentials(form(" secret "), false)).toEqual({email:"seeker@example.org",password:" secret "});
  });
  it("accepts existing short passwords at sign-in without weakening signup", () => {
    expect(emailCredentials(form("six123"), false).password).toBe("six123");
    expect(() => emailCredentials(form("six123"), true)).toThrow();
  });
  it("rejects an empty sign-in password", () => { expect(() => emailCredentials(form(""), false)).toThrow(); });
});