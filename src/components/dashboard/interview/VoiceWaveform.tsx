import { cn } from "@/lib/utils";

/**
 * Simulated voice waveform for mock interview voice mode.
 * Uses staggered CSS animations — real audio analysis can replace
 * the height driver later without changing the API.
 */
const BARS = 22;

export const VoiceWaveform = ({
  active,
  label,
  className,
}: {
  active: boolean;
  label?: string;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors",
        active
          ? "border-[#E88FA0]/40 bg-[#E88FA0]/10"
          : "border-foreground/[0.08] bg-foreground/[0.03]",
        className,
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          active ? "bg-[#E88FA0] animate-pulse" : "bg-foreground/30",
        )}
      />
      <div className="flex items-end gap-[2px] h-4">
        {Array.from({ length: BARS }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "w-[2px] rounded-full",
              active ? "bg-[#E88FA0]" : "bg-foreground/25",
            )}
            style={{
              height: active ? `${20 + ((i * 37) % 70)}%` : "20%",
              animation: active
                ? `wave-bar 900ms ease-in-out ${i * 45}ms infinite`
                : undefined,
            }}
          />
        ))}
      </div>
      <span className="text-[10.5px] uppercase tracking-[0.16em] font-medium text-foreground/60">
        {label ?? (active ? "Listening" : "Voice idle")}
      </span>
      <style>{`
        @keyframes wave-bar {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1.1); }
        }
      `}</style>
    </div>
  );
};

export default VoiceWaveform;
