# Hirely AI Logo

A simple, precise brand mark: an upward chevron in the existing blue gradient, paired with the `hirely·ai` wordmark. Built as inline SVG so it stays crisp at every size and themes with the design tokens.

## The mark

Two clean strokes forming an ascending chevron — career momentum, an upward step. Geometric, rounded stroke caps, equal stroke weight, drawn on a 24x24 grid so it sits perfectly on the pixel grid at small sizes.

- Gradient: `#2f6bff → #1aa3ff` (the same blue→cyan already used by the wordmark dot)
- Two variants: bare chevron (default) and chevron inside a rounded gradient tile for dark/tight placements
- Optional mono fallback in slate ink for single-color contexts

```text
        /\
       /  \        upper stroke — the "lift"
      /    \
    /\      \
   /  \      \     lower stroke — the "base step"
```

## Lockup

`[mark]  hirely · ai` — mark at cap height, wordmark unchanged in weight and tracking. The existing gradient dot stays; the mark and dot share one gradient definition so they read as one system.

## Where it appears

- Navbar (`Navbar.tsx`) — mark + wordmark
- Footer (`Footer.tsx`) — mark + wordmark
- Dashboard sidebar header — mark + wordmark
- Favicon — tile variant, exported to `public/favicon.png`, referenced from `index.html`

## Technical notes

- `src/components/landing/Logo.tsx` gains a `LogoMark` rewrite (currently a plain gradient circle) rendering the chevron SVG, with props for `size`, `variant` (`plain` | `tile` | `mono`), and `className`.
- `LogoLockup` gains an optional `showMark` prop (default on) so existing call sites keep working.
- Gradient uses a `<linearGradient>` with a stable, unique id to avoid collisions when several logos render on one page.
- `aria-hidden` on the mark; the wordmark text carries the accessible name.
- Favicon: render the tile variant to a 64x64 PNG, drop it in `public/`, point `index.html` at it, and remove the default `favicon.ico`.
