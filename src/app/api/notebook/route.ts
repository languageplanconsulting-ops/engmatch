import { NextResponse } from "next/server";
import { DEFAULT_NOTEBOOK_CATEGORIES } from "@/lib/notebook-storage";

export async function GET() {
  return NextResponse.json({
    entries: DEFAULT_NOTEBOOK_CATEGORIES.map((category, index) => ({
      id: `note-${index + 1}`,
      category,
      kind: category === "Grammar" ? "Grammar point" : "Vocabulary",
      term: `Sample ${category.toLowerCase()}`,
      meaning: "Sample meaning",
      explanation: "Sample explanation",
      personalNotes: "",
    })),
  });
}
