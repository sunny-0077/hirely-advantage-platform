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
        "reveal mb-5 flex flex-wrap items-start justify-between gap-4",
        mounted && "in-view",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="font-display font-semibold tracking-tight text-foreground text-[24px] sm:text-[28px] leading-[1.3]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </div>

      {statusLabel && (
        <span className="bg-accent text-primary shrink-0 rounded-md px-3 py-1.5 text-[11px] font-medium text-foreground/70 tracking-tight whitespace-nowrap">
          {statusLabel}
        </span>
      )}
    </div>
  );
}

export default PageHeader;
