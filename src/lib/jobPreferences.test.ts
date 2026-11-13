import { describe, it, expect } from "vitest";
import { addLocation, jobLocationFilter, postOnboardingPath, rankByRole, REMOTE_WORLDWIDE } from "./jobPreferences";
describe("job preferences", () => {
  it("allows up to 3 worldwide places plus Remote / Worldwide", () => {
    let l: string[] = [];
    for (const x of ["London, UK", "Toronto, Canada", "Dubai, UAE", "Paris, France"]) l = addLocation(l, x);
    expect(l).toEqual(["London, UK", "Toronto, Canada", "Dubai, UAE"]);
    expect(addLocation(l, REMOTE_WORLDWIDE)).toHaveLength(4);
  });
  it("filters jobs by the selected places, not a fixed city list", () => {
    expect(jobLocationFilter(["London, UK", "Bangalore, India"], ["On-site"])).toBe("city_hub.ilike.*london*,city_hub.ilike.*bengaluru*");
    expect(jobLocationFilter([REMOTE_WORLDWIDE], ["Hybrid"])).toBe("work_mode.eq.Remote");
  });
  it("ranks jobs matching the target role first", () => {
    expect(rankByRole([{ title: "Sales Lead" }, { title: "Senior Data Analyst" }], "Data Analyst")[0].title).toBe("Senior Data Analyst");
  });
  it("redirects uploads to the analyzer and builders to the builder with template and role", () => {
    expect(postOnboardingPath({ resume_mode: "upload", preferred_template: null, target_job_role: "X" })).toBe("/app/resume");
    expect(postOnboardingPath({ resume_mode: "build", preferred_template: "modern", target_job_role: "Data Analyst" })).toBe("/app/resume-builder?template=modern-ats&role=Data+Analyst");
  });
});
