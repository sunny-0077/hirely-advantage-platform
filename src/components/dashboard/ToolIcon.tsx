import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToolColor = "blue" | "lilac" | "blush" | "orange";

const COLOR_MAP: Record<ToolColor, { bg: string; fg: string }> = {
  blue:   { bg: "hsl(213, 100%, 94%)", fg: "hsl(213, 80%, 40%)" },
  lilac:  { bg: "hsl(270, 100%, 95%)", fg: "hsl(270, 60%, 45%)" },
  blush:  { bg: "hsl(350, 92%, 95%)",  fg: "hsl(350, 60%, 45%)" },
  orange: { bg: "hsl(28, 100%, 95%)",  fg: "hsl(28, 70%, 40%)" },
};

interface ToolIconProps {
  icon: LucideIcon;
  color: ToolColor;
  size?: "sm" | "md";
  className?: string;
}

export function ToolIcon({ icon: Icon, color, size = "md", className }: ToolIconProps) {
  const { bg, fg } = COLOR_MAP[color];
  const box = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const iconSize = size === "sm" ? 16 : 20;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-xl shrink-0",
        "shadow-[inset_0_0_0_1px_hsl(0_0%_0%/0.04)]",
        box,
        className,
      )}
      style={{ backgroundColor: bg, color: fg }}
    >
      <Icon size={iconSize} strokeWidth={2} />
    </span>
  );
}

export default ToolIcon;
