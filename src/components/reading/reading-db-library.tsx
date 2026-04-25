"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readingEntryCards, type ReadingImportedTestPackage } from "@/lib/reading-demo";

export function ReadingDbLibrary() {
  const [packages, setPackages] = useState<ReadingImportedTestPackage[]>([]);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/reading/imports", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { items?: ReadingImportedTestPackage[] };
      setPackages(payload.items ?? []);
    })();
  }, []);

  const readyImports = packages.filter((item) => item.missingPassageIds.length === 0);

  return (
    <div className="stack-lg">
      <div className="section-header">
        <h2>Guided Practice Mode</h2>
        <p>Built-in passages plus imported reading packages that are stored centrally in Supabase.</p>
      </div>

      <div className="reading-entry-grid">
        {readingEntryCards.map((card) => (
          <Link key={card.id} href={`/reading/sets/${card.id}`} className="reading-entry-card">
            <span className="reading-entry-label">{card.label}</span>
            <h3 className="reading-entry-title">{card.description}</h3>
            <div className="reading-entry-meta">
              <span className="reading-entry-chip">{card.level}</span>
              <span className="reading-entry-chip">{card.time}</span>
              <span className="reading-entry-chip">{card.questions} questions</span>
            </div>
          </Link>
        ))}

        {readyImports.map((item) => (
          <Link key={item.test.id} href={`/reading/sets/${item.test.id}`} className="reading-entry-card">
            <span className="reading-entry-label">{item.test.type === "full" ? "Full Test" : "Imported Passage"}</span>
            <h3 className="reading-entry-title">{item.test.title}</h3>
            <div className="reading-entry-meta">
              <span className="reading-entry-chip">{item.test.level}</span>
              <span className="reading-entry-chip">{item.test.timeLimit} min</span>
              <span className="reading-entry-chip">{item.test.passages.flatMap((passage) => passage.questions).length} questions</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
