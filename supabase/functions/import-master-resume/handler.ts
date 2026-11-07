import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { extractImport, ImportError, MAX_IMPORT_BYTES } from "./extract.ts";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
type Client = { auth: { getUser: () => Promise<{ data: { user: { id: string } | null }; error: unknown }> } };

/** No owner/path parameter, storage write, AI call, profile mutation or billing operation. */
export function importHandler(client: (authorization: string) => Client) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Use the resume upload action." }, 405);
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Please sign in to import a resume." }, 401);
    try {
      const { data, error } = await client(authorization).auth.getUser();
      if (error || !data.user) return json({ error: "Please sign in again to import a resume." }, 401);
      const filename = req.headers.get("x-resume-filename") ?? "";
      if (!/\.(pdf|docx)$/i.test(filename) || filename.length > 500) return json({ error: "Only PDF and DOCX resumes are supported." }, 400);
      if (Number(req.headers.get("Content-Length")) > MAX_IMPORT_BYTES) return json({ error: "Choose a resume of 5 MB or less." }, 400);
      const reader = req.body?.getReader();
      if (!reader) return json({ error: "Select a resume file." }, 400);
      const chunks: Uint8Array[] = []; let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          size += value.length;
          if (size > MAX_IMPORT_BYTES) { await reader.cancel(); throw new ImportError("Choose a resume of 5 MB or less."); }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      return json(await extractImport(bytes, filename));
    } catch (e) {
      return json({ error: e instanceof ImportError ? e.message : "Couldn't import this document. Please try another file or enter your details manually." }, e instanceof ImportError ? 400 : 503);
    }
  };
}