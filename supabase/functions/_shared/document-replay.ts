/** Replay completed requests without a second debit. Concurrent duplicate inserts
 * hit the existing unique index INSIDE runPaidAction and refund that invocation. */
export function requestKey(value: unknown): string | null {
  if(value === undefined || value === null) return null;
  if(typeof value!=="string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new Error("Invalid generation request key.");
  return value;
}
export async function completedRequest(db:{from:(table:string)=>any},table:string,userId:string,id:string|null) {
  if(!id) return null;
  const {data,error}=await db.from(table).select("*").eq("user_id",userId).eq("request_id",id).maybeSingle();
  if(error) throw new Error("Couldn't check the previous request. Try again without starting a new request.");
  return data;
}