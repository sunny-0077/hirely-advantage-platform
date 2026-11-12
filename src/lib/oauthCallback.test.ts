import { beforeEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({setSession:vi.fn(),exchangeCodeForSession:vi.fn()}));
vi.mock("@/integrations/supabase/client", () => ({supabase:{auth}}));
beforeEach(() => {vi.resetModules();vi.clearAllMocks();auth.setSession.mockResolvedValue({error:null});auth.exchangeCodeForSession.mockResolvedValue({error:null});});
describe("fresh Google callback session", () => {
  it("establishes a fragment return once and removes credentials from the address", async () => {
    window.history.replaceState(null,"","/auth/callback#access_token=fixture-access&refresh_token=fixture-refresh&type=signin");
    const {establishCallbackSession}=await import("./oauthCallback");
    await Promise.all([establishCallbackSession(),establishCallbackSession()]);
    expect(auth.setSession).toHaveBeenCalledExactlyOnceWith({access_token:"fixture-access",refresh_token:"fixture-refresh"});
    expect(window.location.hash).toBe("#type=signin");
  });
  it("handles query returns while retaining the intended page", async () => {
    window.history.replaceState(null,"","/auth/callback?access_token=fixture-access&refresh_token=fixture-refresh&next=%2Fapp%2Fhome");
    const {establishCallbackSession}=await import("./oauthCallback");await establishCallbackSession();
    expect(auth.setSession).toHaveBeenCalledTimes(1);expect(window.location.search).toBe("?next=%2Fapp%2Fhome");
  });
  it("exchanges authorization codes before navigation", async () => {
    window.history.replaceState(null,"","/auth/callback?code=fixture-code");
    const {establishCallbackSession}=await import("./oauthCallback");await establishCallbackSession();
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("fixture-code");expect(window.location.search).toBe("");
  });
  it("rejects incomplete credentials and scrubs them", async () => {
    window.history.replaceState(null,"","/auth/callback#access_token=fixture-access");
    const {establishCallbackSession}=await import("./oauthCallback");await expect(establishCallbackSession()).rejects.toThrow("Incomplete sign-in link");
    expect(auth.setSession).not.toHaveBeenCalled();expect(window.location.hash).toBe("");
  });
});