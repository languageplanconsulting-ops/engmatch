import { NextResponse } from "next/server";
import { notebookCategories } from "@/lib/demo-data";

export async function GET() {
  return NextResponse.json({ categories: notebookCategories });
}
