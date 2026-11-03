import { describe, expect, it } from "vitest";

const token = process.env.HIRING_TEST_ACCESS_TOKEN;
const url = process.env.HIRING_TEST_URL;
const key = process.env.HIRING_TEST_KEY;
const run = token && url && key ? describe : describe.skip;

run("hiring document permissions", () => {
  it("does not expose submitted documents to signed-out visitors", async () => {
    const response = await fetch(`${url}/rest/v1/job_submissions?select=id`, { headers: { apikey: String(key) } });
    if (response.ok) expect(await response.json()).toEqual([]);
    else expect([401, 403]).toContain(response.status);
  });
  it("rejects a non-candidate application even with document ids", async () => {
    const response = await fetch(`${url}/rest/v1/rpc/submit_job_application`, {
      method: "POST", headers: { apikey: String(key), Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_job_id: "18f1015a-45ba-4484-aecb-51658da020f1", p_resume_id: "aaaf725d-ff12-462e-bbde-f2f9aa4a4491" }),
    });
    expect(response.ok).toBe(false);
    expect((await response.json()).message).toBe("Candidate account required");
  });
});