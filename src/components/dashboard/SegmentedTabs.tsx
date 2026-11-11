import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type SegmentedTab = {
  value: string;
  label: string;
  count?: number;
};

interface SegmentedTabsProps {
  tabs: SegmentedTab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * iOS-style segmented control. Inactive track sits on a faint black wash;
 * the active pill is a solid white card with a subtle 1px shadow.
 */
export const SegmentedTabs = ({ tabs, value, onChange, className }: SegmentedTabsProps) => (
  <div
    className={cn(
      "flex w-fit max-w-full overflow-x-auto gap-1 p-1 rounded-md bg-muted border border-border",
      className,
    )}
    role="tablist"
  >
    {tabs.map((tab) => {
      const active = tab.value === value;
      return (
        <Button variant="ghost" size="sm"
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onChange(tab.value)}
          className={cn(
            "px-3 rounded-md text-xs transition-colors shrink-0",
            active
              ? "bg-card text-primary font-semibold shadow-subtle"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
          {typeof tab.count === "number" && (
            <span
              className={cn(
                "ml-1.5 text-[10px] px-1.5 py-[1px] rounded-full",
                active ? "bg-foreground/[0.06] text-foreground/55" : "bg-foreground/[0.05] text-foreground/45",
              )}
            >
              {tab.count}
            </span>
          )}
        </Button>
      );
    })}
  </div>
);
