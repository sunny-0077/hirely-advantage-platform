import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { ResumeImporter } from "./ResumeImporter";
import { emptyResume, type MasterResume } from "@/lib/masterResume";
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { access_token: "test-only" } }, error: null }) } } }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function setup() {
  const onConfirm = vi.fn(async (_resume: MasterResume) => true);
  const existing = emptyResume(); existing.personal.fullName = "Existing Name";
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ text: "Name: Imported Name\nSkills\nSQL" }), { status: 200 })));
  render(<ResumeImporter existing={existing} disabled={false} onConfirm={onConfirm} />);
  fireEvent.change(screen.getByLabelText("Select resume to import"), { target: { files: [new File(["synthetic test"], "resume.docx")] } });
  return { onConfirm, existing };
}
describe("import review confirmation boundary", () => {
  it("extracting and cancelling never call the save function", async () => {
    const { onConfirm, existing } = setup();
    await screen.findByRole("button", { name: "Cancel and keep current resume" });
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel and keep current resume" }));
    expect(onConfirm).not.toHaveBeenCalled(); expect(existing.personal.fullName).toBe("Existing Name");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
  it("only explicit checked edited fields reach save", async () => {
    const { onConfirm, existing } = setup();
    await screen.findByRole("button", { name: "Confirm import and save" });
    expect(screen.getByRole("button", { name: "Confirm import and save" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Personal information · Full name", { selector: "textarea" }), { target: { value: "Corrected Name" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Import Personal information · Full name" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm import and save" }));
    await screen.findByText("Selected information is saved in your Master Resume.");
    expect(onConfirm).toHaveBeenCalledTimes(1); expect(onConfirm.mock.calls[0]?.[0]?.personal.fullName).toBe("Corrected Name");
    expect(onConfirm.mock.calls[0]?.[0]?.skills.other).toEqual([]); expect(existing.personal.fullName).toBe("Existing Name");
  });
});