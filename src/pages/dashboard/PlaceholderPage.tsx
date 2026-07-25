import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState, PreviewList } from "@/components/dashboard/EmptyState";

interface PlaceholderPageProps {
  eyebrow: string;
  title: string;
  description: string;
  statusLabel?: string;
  icon?: LucideIcon;
}

const PlaceholderPage = ({
  eyebrow,
  title,
  description,
  statusLabel,
  icon = Sparkles,
}: PlaceholderPageProps) => (
  <div className="max-w-6xl mx-auto space-y-6">
    <PageHeader
      eyebrow={eyebrow}
      title={title}
      description={description}
      statusLabel={statusLabel ?? "Coming soon"}
    />
    <EmptyState
      icon={icon}
      title="We're building this next"
      description={description}
      preview={<PreviewList />}
    />
  </div>
);

export default PlaceholderPage;
