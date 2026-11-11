import { useMemo } from "react";
import { BookOpenCheck } from "lucide-react";

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const cleaned = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  const matches = cleaned.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

export function LetterStats({ text }: { text: string }) {
  const stats = useMemo(() => {
    const clean = (text || "").trim();
    const words = clean ? clean.split(/\s+/).filter(Boolean) : [];
    const sentences = clean
      ? clean.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean)
      : [];
    const wordCount = words.length;
    const sentenceCount = Math.max(1, sentences.length);
    const syllables = words.reduce((a, w) => a + countSyllables(w), 0);
    // Flesch Reading Ease
    const flesch =
      wordCount > 0
        ? 206.835 -
          1.015 * (wordCount / sentenceCount) -
          84.6 * (syllables / Math.max(1, wordCount))
        : 0;

    let label: string;
    let tone: string;
    if (flesch >= 70) {
      label = "Easy to read";
      tone = "text-emerald-600 bg-emerald-500/10 ring-1 ring-emerald-500/25";
    } else if (flesch >= 55) {
      label = "Standard";
      tone = "text-violet-700 bg-violet-500/10 ring-1 ring-violet-500/25";
    } else if (flesch >= 40) {
      label = "Fairly hard";
      tone = "text-amber-700 bg-amber-500/10 ring-1 ring-amber-500/25";
    } else {
      label = "Dense";
      tone = "text-rose-700 bg-rose-500/10 ring-1 ring-rose-500/25";
    }

    return {
      words: wordCount,
      sentences: sentences.length,
      avgSentence: sentences.length ? Math.round((wordCount / sentenceCount) * 10) / 10 : 0,
      flesch: Math.round(flesch),
      label,
      tone,
    };
  }, [text]);

  return (
    <div className="mx-auto mt-3 max-w-[640px] flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-foreground/60 tracking-tight">
      <span className="inline-flex items-center gap-1.5">
        <BookOpenCheck className="w-3 h-3 text-foreground/45" />
        <span className="tabular-nums text-foreground/85 font-medium">{stats.words}</span>
        <span>words</span>
      </span>
      <span className="tabular-nums">
        <span className="text-foreground/85 font-medium">{stats.sentences}</span> sentences
      </span>
      <span className="tabular-nums">
        avg <span className="text-foreground/85 font-medium">{stats.avgSentence}</span> w/sentence
      </span>
      <span
        className={`inline-flex items-center gap-1 text-[10.5px] font-semibold tracking-[0.12em] uppercase px-2 py-0.5 rounded-full ${stats.tone}`}
      >
        {stats.label}
        <span className="opacity-70 font-normal normal-case tracking-normal">
          · {stats.flesch}
        </span>
      </span>
    </div>
  );
}
