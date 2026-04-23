import { MetricList, PlaceholderPage } from "@/lib/page-builders";

export default function ReadingAnalyticsPage() {
  return (
    <div className="stack-lg">
      <MetricList
        items={[
          { id: "ra1", label: "Average score", value: "31/40" },
          { id: "ra2", label: "Pace", value: "52 min" },
          { id: "ra3", label: "Best type", value: "Summary" },
        ]}
      />
      <PlaceholderPage
        title="Reading Analytics"
        description="Track passage performance and question-type trends."
        breadcrumbs={[
          { href: "/", label: "Home" },
          { href: "/reading", label: "Reading" },
          { label: "Analytics" },
        ]}
        panels={[
          {
            title: "Trends",
            body: "Check timing curves, accuracy by question type, and review recommendations.",
          },
        ]}
        links={[{ href: "/reading", label: "Back to reading home" }]}
      />
    </div>
  );
}
