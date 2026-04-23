import { demoSets, listeningCategories } from "@/lib/demo-data";
import { MetricList, PlaceholderPage } from "@/lib/page-builders";

export default function ListeningPage() {
  return (
    <div className="stack-lg">
      <MetricList
        items={[
          { id: "l1", label: "Categories", value: String(listeningCategories.length) },
          { id: "l2", label: "Practice sets", value: String(demoSets.listening.length) },
          { id: "l3", label: "Tracked rounds", value: "6" },
        ]}
      />
      <PlaceholderPage
        title="Listening Lab"
        description="Explore category drills, round practice, and set results."
        breadcrumbs={[{ href: "/", label: "Home" }, { label: "Listening" }]}
        panels={demoSets.listening.map((set) => ({
          title: set.title,
          body: `Practice set ${set.id} tuned for ${set.level}.`,
        }))}
        links={[
          ...listeningCategories.map((category) => ({
            href: `/listening/${category}`,
            label: `Category: ${category}`,
          })),
          { href: "/listening/analytics", label: "Listening analytics" },
        ]}
      />
    </div>
  );
}
