import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runPaidAction } from "../_shared/credits.ts";
import { resolveUserResume } from "../_shared/resume-source.ts";
import { completedRequest, requestKey } from "../_shared/document-replay.ts";
const opts={userId:"owner",action:"resume_tailor" as const,feature:"tailor-resume",provider:"p",estimatedCostUsd:0.003};
Deno.test("missing resume resolution prevents any credit reservation",async()=>{
  const calls:string[]=[];
  const chain={select:()=>chain,eq:()=>chain,maybeSingle:async()=>({data:{master_resume_json:{},master_resume_text:""},error:null})};
  const db={rpc:(name:string)=>{calls.push(name);return Promise.resolve({data:"debit",error:null});},from:()=>chain};
  await assertRejects(async()=>{await resolveUserResume(db,"owner");await runPaidAction(opts,async()=>"unreachable",db);});
  assertEquals(calls,[]);
});
Deno.test("completed replay returns original document without spending again and is user scoped",async()=>{
  const calls:string[]=[];
  const doc={id:"saved"};
  const chain={select:()=>chain,eq:(k:string,v:string)=>{calls.push(`${k}=${v}`);return chain;},maybeSingle:async()=>({data:doc,error:null})};
  const db={rpc:(name:string)=>{calls.push(name);return Promise.resolve({data:"debit",error:null});},from:()=>chain};
  const result=await completedRequest(db,"resume_tailorings","owner",requestKey("12345678-1234-1234-1234-123456789012"));
  assertEquals(result,doc);assertEquals(calls,["user_id=owner","request_id=12345678-1234-1234-1234-123456789012"]);
});
Deno.test("concurrent duplicate save failure refunds only that invocation",async()=>{
  const calls:string[]=[];
  const db={rpc:(name:string)=>{calls.push(name);return Promise.resolve({data:"second-debit",error:null});},from:()=>({insert:(row:{status:string})=>{calls.push(row.status);return Promise.resolve({error:null});}})};
  await assertRejects(()=>runPaidAction(opts,async()=>{throw new Error("duplicate request_id save");},db));
  assertEquals(calls,["spend_credits","failed","refund_credits"]);
});