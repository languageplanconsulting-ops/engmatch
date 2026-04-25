import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { asJsonInput } from "@/lib/db-content";
import type { ReadingImportedTestPackage } from "@/lib/reading-demo";

type ReadingImportRequest = {
  packages?: unknown;
};

function isReadingImportedTestPackage(value: unknown): value is ReadingImportedTestPackage {
  return typeof value === "object" && value !== null && "id" in value && "test" in value;
}

export async function GET() {
  const items = await prisma.readingImportPackage.findMany({
    orderBy: { importedAt: "desc" },
  });

  return NextResponse.json({
    items: items.map((item) => item.payload),
  });
}

export async function POST(request: Request) {
  let body: ReadingImportRequest;

  try {
    body = (await request.json()) as ReadingImportRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const packages = Array.isArray(body.packages) ? body.packages.filter(isReadingImportedTestPackage) : [];
  if (packages.length === 0) {
    return NextResponse.json({ error: "No valid reading packages found." }, { status: 400 });
  }

  for (const item of packages) {
    await prisma.readingImportPackage.upsert({
      where: { id: item.id },
      update: {
        exam: item.exam,
        importedAt: new Date(item.importedAt),
        payload: asJsonInput(item),
      },
      create: {
        id: item.id,
        exam: item.exam,
        importedAt: new Date(item.importedAt),
        payload: asJsonInput(item),
      },
    });
  }

  const items = await prisma.readingImportPackage.findMany({
    orderBy: { importedAt: "desc" },
  });

  return NextResponse.json({
    savedCount: packages.length,
    items: items.map((item) => item.payload),
  });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const packageId = url.searchParams.get("packageId");
  if (!packageId) {
    return NextResponse.json({ error: "packageId is required." }, { status: 400 });
  }

  await prisma.readingImportPackage.deleteMany({
    where: { id: packageId },
  });

  return NextResponse.json({ ok: true, packageId });
}
