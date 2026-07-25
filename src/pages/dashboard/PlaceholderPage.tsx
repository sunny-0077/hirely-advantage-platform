import { SectionCard } from "@/components/dashboard/SectionCard";
import { PageHeader } from "@/components/dashboard/PageHeader";

interface PlaceholderPageProps {
  eyebrow: string;
  title: string;
  description: string;
  statusLabel?: string;
}

const PlaceholderPage = ({ eyebrow, title, description, statusLabel }: PlaceholderPageProps) => (
  <div className="max-w-6xl mx-auto">
    <PageHeader
      eyebrow={eyebrow}
      title={title}
      description={description}
      statusLabel={statusLabel ?? "Coming soon"}
    />
    <SectionCard>
      <p className="text-[13.5px] text-foreground/65 leading-relaxed">{description}</p>
    </SectionCard>
  </div>
);

export default PlaceholderPage;
