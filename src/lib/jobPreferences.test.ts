import { describe, it, expect } from "vitest";
import { addLocation, jobLocationFilter, jobRoleFilter, postOnboardingPath, rankByRole, REMOTE_WORLDWIDE } from "./jobPreferences";
describe("job preferences", () => {
  it("allows up to 3 worldwide places plus Remote / Worldwide", () => {
    let l: string[] = [];
    for (const x of ["London, UK", "Toronto, Canada", "Dubai, UAE", "Paris, France"]) l = addLocation(l, x);
    expect(l).toEqual(["London, UK", "Toronto, Canada", "Dubai, UAE"]);
    expect(addLocation(l, REMOTE_WORLDWIDE)).toHaveLength(4);
  });
  it("filters jobs by the selected places, not a fixed city list", () => {
    expect(jobLocationFilter(["London, UK", "Bangalore, India"], ["On-site"])).toBe("and(location_keys.cs.{london},or(country_keys.cs.{united kingdom},country_keys.eq.{})),and(location_keys.cs.{bengaluru},or(country_keys.cs.{india},country_keys.eq.{}))");
    expect(jobLocationFilter([REMOTE_WORLDWIDE], ["Hybrid"])).toBe("and(work_mode.eq.Remote,remote_scope.eq.Worldwide)");
  });
  it("keeps remote jobs constrained to selected cities unless worldwide was selected", () => {
    expect(jobLocationFilter(["Toronto, Canada"], ["Remote"])).toBe("and(location_keys.cs.{toronto},or(country_keys.cs.{canada},country_keys.eq.{}))");
  });
  it("supports country selection and removes duplicate location choices", () => {
    expect(jobLocationFilter(["USA"], [])).toBe("location_keys.cs.{united states}");
    expect(addLocation(["London, UK"], " london, uk ")).toEqual(["London, UK"]);
  });
  it("filters for role terms before limiting the feed", () => {
    expect(jobRoleFilter("Senior Data Analyst")).toBe("title.ilike.*data*,title.ilike.*analyst*");
  });
  it("ranks jobs matching the target role first", () => {
    expect(rankByRole([{ title: "Sales Lead" }, { title: "Senior Data Analyst" }], "Data Analyst")[0].title).toBe("Senior Data Analyst");
  });
  it("redirects uploads to the analyzer and builders to the builder with template and role", () => {
    expect(postOnboardingPath({ resume_mode: "upload", preferred_template: null, target_job_role: "X" })).toBe("/app/resume");
    expect(postOnboardingPath({ resume_mode: "build", preferred_template: "modern", target_job_role: "Data Analyst" })).toBe("/app/resume-builder?template=modern-ats&role=Data+Analyst");
  });
});
