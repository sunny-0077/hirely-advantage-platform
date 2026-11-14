import sans from "@/assets/resume-fonts/noto-sans.ttf.asset.json";
import sansBold from "@/assets/resume-fonts/noto-sans-bold.ttf.asset.json";
import serif from "@/assets/resume-fonts/noto-serif.ttf.asset.json";
import serifBold from "@/assets/resume-fonts/noto-serif-bold.ttf.asset.json";
import mono from "@/assets/resume-fonts/noto-sans-mono.ttf.asset.json";
import type { ResumeSettings } from "./types";
export const documentFonts={sans,sansBold,serif,serifBold,mono};
export const documentFontCss = `@font-face{font-family:'Hirely Document Sans';src:url('${sans.url}')}@font-face{font-family:'Hirely Document Sans';font-weight:700;src:url('${sansBold.url}')}@font-face{font-family:'Hirely Document Serif';src:url('${serif.url}')}@font-face{font-family:'Hirely Document Serif';font-weight:700;src:url('${serifBold.url}')}@font-face{font-family:'Hirely Document Mono';src:url('${mono.url}')}`;
export const documentFontFamily=(font:ResumeSettings["fontFamily"])=>font==="Times"||font==="Georgia"?"Hirely Document Serif":"Hirely Document Sans";
const cached=new Map<string,Promise<string>>();
export function fontBase64(url:string) {
  const prior=cached.get(url);if(prior)return prior;
  const pending=fetch(url).then(async r=>{if(!r.ok)throw new Error("Document font unavailable");const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.length<4||bytes[0]!==0||bytes[1]!==1)throw new Error("Document font unavailable");let binary="";for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);});
  cached.set(url,pending);pending.catch(()=>cached.delete(url));return pending;
}