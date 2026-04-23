import { MetricList, PlaceholderPage } from "@/lib/page-builders";

export default function ListeningAnalyticsPage() {
  return (
    <div className="stack-lg">
      <MetricList
        items={[
          { id: "la1", label: "Accuracy", value: "78%" },
          { id: "la2", label: "Best category", value: "Maps" },
          { id: "la3", label: "Weakest skill", value: "Distractors" },
        ]}
      />
      <PlaceholderPage
        title="Listening Analytics"
        description="Track listening accuracy trends and focus areas."
        breadcrumbs={[
          { href: "/", label: "Home" },
          { href: "/listening", label: "Listening" },
          { label: "Analytics" },
        ]}
        panels={[
          {
            title: "Performance trends",
            body: "Review accuracy changes over time and identify weak question types.",
          },
          {
            title: "Next focus",
            body: "Use these insights to choose your next listening practice set.",
          },
        ]}
        links={[{ href: "/listening", label: "Back to listening home" }]}
      />
    </div>
  );
}
