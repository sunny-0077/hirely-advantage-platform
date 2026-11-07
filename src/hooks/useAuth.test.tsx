import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./useAuth";

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), getUser: vi.fn(), onAuthStateChange: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: mocks } }));
function Probe() { const auth = useAuth(); return <div>{auth.loading ? "checking" : auth.user ? "private workspace" : "signed out"}</div>; }
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("validated authentication state", () => {
  it("does not render private content while server validation is pending", async () => {
    let resolveUser: (value: unknown) => void = () => {};
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: "user-a" } } } });
    mocks.getUser.mockImplementation(() => new Promise(resolve => { resolveUser = resolve; }));
    mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(mocks.getUser).toHaveBeenCalled());
    expect(screen.queryByText("private workspace")).toBeNull();
    await act(async () => { resolveUser({ data: { user: { id: "user-a" } }, error: null }); });
    expect(await screen.findByText("private workspace")).toBeInTheDocument();
  });
  it("rejects expired or invalid sessions", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: "user-a" } } } });
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { message: "expired" } });
    mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(await screen.findByText("signed out")).toBeInTheDocument();
  });
  it("ignores stale validation results after logout", async () => {
    let listener: (event: string, session: unknown) => void = () => {};
    let resolveUser: (value: unknown) => void = () => {};
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: "user-a" } } } });
    mocks.getUser.mockImplementation(() => new Promise(resolve => { resolveUser = resolve; }));
    mocks.onAuthStateChange.mockImplementation(callback => { listener = callback; return { data: { subscription: { unsubscribe: vi.fn() } } }; });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(mocks.getUser).toHaveBeenCalled());
    await act(async () => { listener("SIGNED_OUT", null); resolveUser({ data: { user: { id: "user-a" } }, error: null }); });
    expect(screen.getByText("signed out")).toBeInTheDocument();
  });
});