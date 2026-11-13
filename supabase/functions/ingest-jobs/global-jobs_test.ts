import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { globalLocation, safeApplyUrl } from "../_shared/global-jobs.ts";
Deno.test("retains global cities and normalizes country aliases", () => {
  const p = globalLocation("London, UK");
  assertEquals(p.location, "London, UK");
  assertEquals(p.keys, ["london", "united kingdom"]);
  assertEquals(p.countries, ["united kingdom"]);
});
Deno.test("US-only remote is not worldwide", () => {
  const p = globalLocation("Remote - USA");
  assertEquals(p.workMode, "Remote");
  assertEquals(p.remoteScope, "Restricted");
  assertEquals(p.keys, ["united states"]);
});
Deno.test("worldwide remote requires an explicit employer statement", () => {
  assertEquals(globalLocation("Worldwide", "Remote").remoteScope, "Worldwide");
  assertEquals(globalLocation("Berlin, Germany", "Remote").remoteScope, "Restricted");
  assertEquals(globalLocation("Remote").remoteScope, "Restricted");
});
Deno.test("multiple employer locations remain separately searchable", () => {
  assertEquals(globalLocation("San Francisco, CA • New York, NY • United States").keys, ["san francisco", "ca", "new york", "ny", "united states"]);
});
Deno.test("rejects unsafe application links", () => {
  assertEquals(safeApplyUrl("javascript:alert(1)"), null);
  assertEquals(safeApplyUrl("https://example.com/job/1"), "https://example.com/job/1");
});