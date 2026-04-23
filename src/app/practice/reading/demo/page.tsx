import { PlaceholderPage } from "@/lib/page-builders";

export default function ReadingDemoPage() {
  return (
    <PlaceholderPage
      title="Reading Demo"
      description="Quick reading practice demo to test timing and flow."
      breadcrumbs={[
        { href: "/", label: "Home" },
        { href: "/reading", label: "Reading" },
        { label: "Demo" },
      ]}
      panels={[
        {
          title: "Passage preview",
          body: "Try a sample passage flow with question navigation and timing rhythm.",
        },
        {
          title: "Next step",
          body: "Move to Reading Analytics to review performance and plan revision.",
        },
      ]}
      links={[
        { href: "/reading/analytics", label: "Reading analytics" },
        { href: "/reading", label: "Back to reading home" },
      ]}
    />
  );
}
