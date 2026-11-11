import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Jobs from "./Jobs";

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), eq: vi.fn() }));
vi.mock("@/hooks/useResumeSource", () => ({ useResumeSource: () => ({ data: { available: true, label: "Master Resume" } }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: () => ({ select: () => ({ eq: mocks.eq }) }),
  functions: { invoke: mocks.invoke },
} }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const jobs = [
  { id: "one", title: "Data Analyst", company_name: "Example", city_hub: "Bengaluru", work_mode: "Remote", truth_card_json: { true_tech_stack: ["SQL"] }, fetched_at: "2026-11-10T12:00:00Z", apply_url: "https://example.com/job" },
  { id: "two", title: "Engineer", company_name: "Second", city_hub: "Bengaluru", work_mode: "Hybrid", truth_card_json: {}, fetched_at: "2026-11-10T12:00:00Z" },
];
function setup() {
  mocks.eq.mockReturnValue({ order: () => ({ limit: async () => ({ data: jobs, error: null }) }) });
  mocks.invoke.mockResolvedValue({ data: { error: "Test only; no generation" }, error: null });
  render(<MemoryRouter><Jobs /></MemoryRouter>);
}
describe("Jobs interaction regression", () => {
  it("filters by skill and clears without invoking a paid action", async () => {
    setup(); await screen.findByText("Data Analyst");
    fireEvent.change(screen.getByRole("textbox", { name: "Search jobs" }), { target: { value: "SQL" } });
    expect(screen.queryByText("Engineer")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByText("Engineer")).toBeInTheDocument();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it("keeps tailoring connected to the same job with a retry key", async () => {
    setup(); await screen.findByText("Data Analyst");
    fireEvent.click(screen.getByRole("button", { name: "Tailor Resume for Data Analyst" }));
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith("tailor-resume", { body: { job_id: "one", target_role: "Data Analyst", request_id: expect.any(String) } }));
  });
  it("queries the selected city without generating documents", async () => {
    setup(); await screen.findByText("Data Analyst");
    fireEvent.click(screen.getByRole("tab", { name: "Hyderabad" }));
    await waitFor(() => expect(mocks.eq).toHaveBeenLastCalledWith("city_hub", "Hyderabad"));
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
});