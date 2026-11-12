import sans from "@/assets/resume-fonts/noto-sans.ttf.asset.json";
import sansBold from "@/assets/resume-fonts/noto-sans-bold.ttf.asset.json";
import serif from "@/assets/resume-fonts/noto-serif.ttf.asset.json";
import serifBold from "@/assets/resume-fonts/noto-serif-bold.ttf.asset.json";
import type { ResumeSettings } from "./types";
export const documentFonts={sans,sansBold,serif,serifBold};
export const documentFontFamily=(font:ResumeSettings["fontFamily"])=>font==="Times"||font==="Georgia"?"Hirely Document Serif":"Hirely Document Sans";
const cached=new Map<string,Promise<string>>();
export function fontBase64(url:string) {
  const prior=cached.get(url);if(prior)return prior;
  const pending=fetch(url).then(async r=>{if(!r.ok)throw new Error("Document font unavailable");const bytes=new Uint8Array(await r.arrayBuffer());let binary="";for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);});
  cached.set(url,pending);pending.catch(()=>cached.delete(url));return pending;
}