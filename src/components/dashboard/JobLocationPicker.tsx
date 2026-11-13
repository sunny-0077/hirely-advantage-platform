import { useEffect, useMemo, useState } from "react";
import { Globe2, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addLocation, MAX_LOCATIONS, REMOTE_WORLDWIDE, suggestedHubs, WORK_MODES } from "@/lib/jobPreferences";

export function JobLocationPicker({ locations, modes, onLocations, onModes }: { locations: string[]; modes: string[]; onLocations: (v: string[]) => void; onModes: (v: string[]) => void }) {
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<string[]>([]);
  const hubs = useMemo(() => suggestedHubs(), []);
  const real = locations.filter(l => l !== REMOTE_WORLDWIDE);
  const full = real.length >= MAX_LOCATIONS;
  useEffect(() => {
    setPlaces([]);
    if (query.trim().length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`https://geocoding-api.open-meteo.com/v1/search?count=6&language=en&name=${encodeURIComponent(query.trim())}`, { signal: ctrl.signal })
        .then(r => r.json()).then((d: { results?: { name: string; country?: string }[] }) => {
          if (!ctrl.signal.aborted) setPlaces([...new Set((d.results ?? []).map(p => [p.name, p.country].filter(Boolean).join(", ")))]);
        }).catch(() => { if (!ctrl.signal.aborted) setPlaces([]); });
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query]);
  const pick = (v: string) => { onLocations(addLocation(locations, v)); setQuery(""); };
  const toggle = (v: string) => onLocations(locations.includes(v) ? locations.filter(l => l !== v) : addLocation(locations, v));
  return <div className="space-y-5">
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input aria-label="Search cities or countries" className="pl-9 h-12" disabled={full} placeholder={full ? "3 places selected" : "Search any city or country"} value={query} maxLength={120}
        onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (query.trim()) pick(places[0] ?? query); } }} />
      {query.trim().length > 1 && !full && <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
        {places.map(p => <Button key={p} type="button" variant="ghost" className="w-full justify-start h-auto whitespace-normal py-2.5" onClick={() => pick(p)}>{p}</Button>)}
        <Button type="button" variant="ghost" className="w-full justify-start h-auto whitespace-normal py-2.5" onClick={() => pick(query)}>Use “{query.trim()}”</Button>
      </div>}
    </div>
    <p className="text-sm text-muted-foreground">{real.length} / {MAX_LOCATIONS} locations selected</p>
    <div className="flex flex-wrap gap-2">{real.map(l => <span key={l} className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-primary text-primary-foreground pl-3 pr-1.5 py-1 text-sm"><span className="break-words min-w-0">{l}</span>
      <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${l}`} className="rounded-full size-6 shrink-0 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground" onClick={() => toggle(l)}><X className="size-3.5" /></Button></span>)}</div>
    <div className="space-y-2"><p className="text-sm font-medium">Quick picks</p><div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant={locations.includes(REMOTE_WORLDWIDE) ? "default" : "outline"} aria-pressed={locations.includes(REMOTE_WORLDWIDE)} className="rounded-full" onClick={() => toggle(REMOTE_WORLDWIDE)}><Globe2 className="size-4" />{REMOTE_WORLDWIDE}</Button>
      {hubs.filter(h => !locations.includes(h)).map(h => <Button key={h} type="button" size="sm" variant="outline" disabled={full} className="rounded-full" onClick={() => pick(h)}>{h}</Button>)}
    </div></div>
    <div className="space-y-2"><p className="text-sm font-medium">Work mode</p><div className="flex flex-wrap gap-2">{WORK_MODES.map(m => <Button key={m} type="button" size="sm" variant={modes.includes(m) ? "secondary" : "outline"} className="rounded-full" aria-pressed={modes.includes(m)} onClick={() => onModes(modes.includes(m) ? modes.filter(x => x !== m) : [...modes, m])}>{m}</Button>)}</div></div>
  </div>;
}