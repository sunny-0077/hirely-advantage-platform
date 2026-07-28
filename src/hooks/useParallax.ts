import { useEffect, useRef } from "react";

/**
 * Applies a subtle scroll-linked translateY via the CSS var `--parallax-y`
 * on the returned ref. Uses rAF throttling and IntersectionObserver so it
 * only paints while the element is on-screen.
 *
 * `speed` — px translated per 100px of scroll relative to the element's
 * center crossing the viewport center. Small values (0.05–0.2) feel premium.
 */
export function useParallax<T extends HTMLElement = HTMLDivElement>(speed = 0.12) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let visible = false;
    let raf = 0;

    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // distance of element center from viewport center, in px
      const delta = rect.top + rect.height / 2 - vh / 2;
      const y = -delta * speed;
      el.style.setProperty("--parallax-y", `${y.toFixed(2)}px`);
    };

    const onScroll = () => {
      if (!visible || raf) return;
      raf = requestAnimationFrame(update);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) update();
      },
      { threshold: 0 },
    );
    io.observe(el);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [speed]);

  return ref;
}
