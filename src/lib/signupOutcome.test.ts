import { describe, expect, it } from "vitest";
import { signupOutcome } from "./signupOutcome";

describe("signup confirmation", () => {
  it("does not claim an email was sent for an existing-account response", () => {
    expect(signupOutcome({ session: null, user: { identities: [] } })).toBe("sign-in");
  });
  it("keeps new accounts awaiting verification", () => {
    expect(signupOutcome({ session: null, user: { identities: [{ provider: "email" }] } })).toBe("confirmation");
  });
  it("does not wait for confirmation when a session is provided", () => {
    expect(signupOutcome({ session: {}, user: { identities: [] } })).toBe("signed-in");
  });
});