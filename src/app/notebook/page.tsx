import { notebookCategories } from "@/lib/demo-data";
import { PlaceholderPage } from "@/lib/page-builders";

export default function NotebookPage() {
  return (
    <PlaceholderPage
      title="Notebook"
      description="A lightweight vocabulary board for saved words, phrases, and category-based revision."
      breadcrumbs={[{ href: "/", label: "Home" }, { label: "Notebook" }]}
      panels={[
        {
          title: "Saved vocabulary",
          body: "Preview words from listening and reading sessions, with room for definitions, examples, and confidence tags.",
        },
        {
          title: "Category review",
          body: `Current demo categories: ${notebookCategories.join(", ")}.`,
        },
      ]}
      links={[
        { href: "/reading", label: "Go to reading practice" },
        { href: "/listening", label: "Go to listening practice" },
      ]}
    />
  );
}
