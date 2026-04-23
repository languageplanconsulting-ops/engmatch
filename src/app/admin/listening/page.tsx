import { adminQueues } from "@/lib/demo-data";
import { MetricList, PlaceholderPage } from "@/lib/page-builders";

export default function AdminListeningPage() {
  return (
    <div className="stack-lg">
      <MetricList items={adminQueues.listening} />
      <PlaceholderPage
        title="Admin Listening"
        description="Recovered admin surface for listening content operations."
        breadcrumbs={[
          { href: "/", label: "Home" },
          { label: "Admin Listening" },
        ]}
        panels={[
          {
            title: "Publishing queue",
            body: "Use this route for set management, audio QA status, and release scheduling.",
          },
        ]}
        links={[
          { href: "/api/admin/listening/sets", label: "Admin listening sets API" },
          { href: "/listening", label: "Open learner listening view" },
        ]}
      />
    </div>
  );
}
