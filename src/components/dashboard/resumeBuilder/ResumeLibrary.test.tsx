import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ResumeLibrary } from "./ResumeLibrary";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  rpc,
  from: () => ({ select: () => ({ order: () => Promise.resolve({ data: [], error: null }), then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve) }) }),
} }));
vi.mock("./ResumePreview", () => ({ FittedResumePreview: () => null }));

describe("full resume title catalog", () => {
  beforeEach(() => {
    cleanup();
    vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
    rpc.mockReset();
    rpc.mockImplementation((_name, args) => Promise.resolve({ error: null, data: Array.from({ length: 24 }, (_, i) => ({
      id: `title-${args.p_offset + i}`, occupation_id: "occupation", title: `Real catalog title ${args.p_offset + i}`, industry_id: "", category_id: "", total_count: 45808,
    })) }));
  });
  const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ResumeLibrary current={null} onUse={vi.fn()} /></QueryClientProvider>);
  it("loads the full catalog with an empty search instead of the 28 curated titles", async () => {
    mount();
    await screen.findByRole("button", { name: "View templates for Real catalog title 0" });
    expect(screen.getAllByRole("button", { name: /^View templates for/ })).toHaveLength(24);
    expect(rpc).toHaveBeenCalledWith("search_resume_titles", expect.objectContaining({ p_search: "", p_offset: 0 }));
    expect(screen.queryByRole("button", { name: "View templates for Software Engineer" })).not.toBeInTheDocument();
  });
  it("browses the next catalog page without requiring a search filter", async () => {
    mount();
    await screen.findByRole("button", { name: "View templates for Real catalog title 0" });
    fireEvent.click(screen.getByRole("button", { name: "Next titles" }));
    await screen.findByRole("button", { name: "View templates for Real catalog title 24" });
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("search_resume_titles", expect.objectContaining({ p_search: "", p_offset: 24 })));
    expect(screen.queryByRole("button", { name: "View templates for Real catalog title 0" })).not.toBeInTheDocument();
  });
});