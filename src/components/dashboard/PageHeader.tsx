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
        "reveal mb-5 flex flex-wrap items-start justify-between gap-3",
        mounted && "in-view",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[10px] uppercase tracking-normal text-muted-foreground font-semibold">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display font-extrabold text-foreground text-[26px] sm:text-[32px] leading-[1.2] mt-1">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-3xl">
            {description}
          </p>
        )}
      </div>

      {statusLabel && (
        <span className="bg-accent text-accent-foreground rounded-md px-3 py-1.5 text-[11px] font-semibold max-w-full">
          {statusLabel}
        </span>
      )}
    </div>
  );
}

export default PageHeader;
