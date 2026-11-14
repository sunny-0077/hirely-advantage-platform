import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export const ThemeToggle = ({ withLabel = false, className = "" }: { withLabel?: boolean; className?: string }) => {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const label = dark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <Button type="button" variant="ghost" size={withLabel ? "sm" : "icon"} aria-label={label} title={label}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={`${withLabel ? "justify-start gap-2.5 px-3 text-[13px]" : ""} text-muted-foreground hover:text-foreground ${className}`}>
      {dark ? <Sun className="size-4 shrink-0" /> : <Moon className="size-4 shrink-0" />}
      {withLabel && (dark ? "Light mode" : "Dark mode")}
    </Button>
  );
};
