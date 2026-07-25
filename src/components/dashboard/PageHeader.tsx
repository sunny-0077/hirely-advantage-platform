import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  statusLabel?: string;
  className?: string;
}

/**
 * Consistent header for every /app/* dashboard page.
 * Fade-up on mount using the app's shared easing curve.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  statusLabel,
  className,
}: PageHeaderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "reveal mb-7 flex items-start justify-between gap-4",
        mounted && "in-view",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/40 font-medium">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display font-semibold tracking-tight text-foreground text-[24px] sm:text-[28px] leading-[1.15] mt-1.5">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-[13.5px] text-muted-foreground leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </div>

      {statusLabel && (
        <span className="glass-subtle shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium text-foreground/70 tracking-tight whitespace-nowrap">
          {statusLabel}
        </span>
      )}
    </div>
  );
}

export default PageHeader;
