import { useId } from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Tailwind text size class for the wordmark, e.g. "text-lg", "text-xl", "text-3xl" */
  size?: string;
  /** Render the chevron mark before the wordmark */
  showMark?: boolean;
}

type MarkVariant = "plain" | "tile" | "mono";

/**
 * Hirely AI mark — an ascending double chevron.
 * Two equal-weight strokes on a 24x24 grid: the lower "step" and the upper "lift".
 */
export const LogoMark = ({
  size = 28,
  variant = "plain",
  className,
}: {
  size?: number;
  variant?: MarkVariant;
  className?: string;
}) => {
  const gid = useId().replace(/:/g, "");
  const stroke = variant === "mono" ? "currentColor" : `url(#hg-${gid})`;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={`hg-${gid}`} x1="4" y1="20" x2="20" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="hsl(220 90% 60%)" />
          <stop offset="100%" stopColor="hsl(200 100% 55%)" />
        </linearGradient>
      </defs>

      {variant === "tile" && (
        <rect x="0" y="0" width="24" height="24" rx="6.5" fill={`url(#hg-${gid})`} />
      )}

      <g
        fill="none"
        stroke={variant === "tile" ? "hsl(0 0% 100%)" : stroke}
        strokeWidth={variant === "tile" ? 2.4 : 2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={variant === "tile" ? "M6.5 18 L12 12.5 L17.5 18" : "M4.5 19 L12 11.5 L19.5 19"} />
        <path d={variant === "tile" ? "M6.5 12 L12 6.5 L17.5 12" : "M4.5 12.5 L12 5 L19.5 12.5"} />
      </g>
    </svg>
  );
};

/**
 * Hirely wordmark lockup:
 *   [mark] hirely
 */
export const LogoLockup = ({ className, size = "text-xl", showMark = true }: LogoProps) => {
  return (
    <span className={cn("inline-flex items-center gap-2 tracking-[-0.03em]", className)}>
      {showMark && <LogoMark size={24} />}
      <span className={cn("font-semibold text-foreground", size)}>hirely</span>
    </span>
  );
};
