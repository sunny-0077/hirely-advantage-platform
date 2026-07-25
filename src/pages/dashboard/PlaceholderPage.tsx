import type { ReactNode } from "react";
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
  preview?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
}

const PlaceholderPage = ({
  eyebrow,
  title,
  description,
  statusLabel,
  icon = Sparkles,
  preview,
  emptyTitle,
  emptyDescription,
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
      title={emptyTitle ?? "We're building this next"}
      description={emptyDescription ?? description}
      preview={preview ?? <PreviewList />}
    />
  </div>
);

export default PlaceholderPage;
