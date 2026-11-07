import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import ResetPassword from "./ResetPassword";

const mocks = vi.hoisted(() => ({ auth: { user: { id: "user-a" } as { id: string } | null, loading: false, recovering: true }, getUser: vi.fn(), updateUser: vi.fn(), signOut: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: mocks } }));
vi.mock("@/components/landing/Logo", () => ({ LogoLockup: () => <span>Hirely</span> }));
afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.auth.recovering = true; });
describe("secure password reset", () => {
  it("refuses an ordinary login session without recovery", () => {
    mocks.auth.recovering = false;
    render(<MemoryRouter><ResetPassword /></MemoryRouter>);
    expect(screen.queryByLabelText("New password")).toBeNull();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it("rejects mismatched passwords without sending an update", () => {
    render(<MemoryRouter><ResetPassword /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "safe-example-password" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "different-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Passwords don't match.");
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it("validates the recovery user and updates without current_password", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-a" } }, error: null });
    mocks.updateUser.mockResolvedValue({ error: null });
    mocks.signOut.mockResolvedValue({ error: null });
    render(<MemoryRouter><ResetPassword /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "safe-example-password" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "safe-example-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Update password" }));
    await waitFor(() => expect(mocks.updateUser).toHaveBeenCalledWith({ password: "safe-example-password" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Your password has been updated.");
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});