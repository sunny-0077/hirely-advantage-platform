import { expect, it } from "vitest";
import { assertSuppliedMetrics, suppliedSkills } from "../../supabase/functions/_shared/career-output";
it("rejects unsupported percentage claims rather than exporting them",()=>{
  expect(()=>assertSuppliedMetrics("Improved performance by 40%","Prepared reports")).toThrow("unsupported metric");
});
it("preserves metrics actually supplied by the user",()=>{
  expect(()=>assertSuppliedMetrics("Reduced errors 12%", "Achievement: Reduced errors 12%")).not.toThrow();
});
it("does not promote missing job keywords to factual candidate skills",()=>{
  expect(suppliedSkills(["SQL","Kubernetes","Python"],"Technical skills\nSQL\nPython")).toEqual(["SQL","Python"]);
});