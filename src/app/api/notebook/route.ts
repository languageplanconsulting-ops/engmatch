import { NextResponse } from "next/server";
import { notebookCategories } from "@/lib/demo-data";

export async function GET() {
  return NextResponse.json({
    entries: notebookCategories.map((category, index) => ({
      id: `note-${index + 1}`,
      category,
      word: `Sample ${category.toLowerCase()}`,
    })),
  });
}
