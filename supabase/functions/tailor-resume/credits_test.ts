import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runPaidAction } from "../_shared/credits.ts";

function fakeDb() {
  const calls: { rpc: string[]; logs: string[] } = { rpc: [], logs: [] };
  const db = {
    rpc: (name: string) => { calls.rpc.push(name); return Promise.resolve({ data: "ledger-1", error: null }); },
    from: () => ({ insert: (row: { status: string }) => { calls.logs.push(row.status); return Promise.resolve({ error: null }); } }),
  };
  return { db, calls };
}
const opts = { userId: "u", action: "resume_tailor" as const, feature: "tailor-resume", provider: "p", estimatedCostUsd: 0.003 };

Deno.test("success deducts once, logs success, no refund", async () => {
  const { db, calls } = fakeDb();
  assertEquals(await runPaidAction(opts, async () => "ok", db), "ok");
  assertEquals(calls.rpc, ["spend_credits"]);
  assertEquals(calls.logs, ["success"]);
});

Deno.test("AI failure or timeout refunds the credit and logs failed", async () => {
  const { db, calls } = fakeDb();
  await assertRejects(() => runPaidAction(opts, async () => { throw new Error("timeout"); }, db));
  assertEquals(calls.rpc, ["spend_credits", "refund_credits"]);
  assertEquals(calls.logs, ["failed"]);
});
