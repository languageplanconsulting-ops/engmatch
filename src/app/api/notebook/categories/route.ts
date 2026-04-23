import { NextResponse } from "next/server";
import { DEFAULT_NOTEBOOK_CATEGORIES } from "@/lib/notebook-storage";

export async function GET() {
  return NextResponse.json({ categories: DEFAULT_NOTEBOOK_CATEGORIES });
}
