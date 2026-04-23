export const DEFAULT_NOTEBOOK_CATEGORIES = [
  "Vocabulary",
  "Grammar",
  "Speaking",
  "Writing",
  "Reading",
  "Listening",
] as const;

const NOTEBOOK_CATEGORIES_KEY = "engmatch-notebook-categories-v2";
const NOTEBOOK_ENTRIES_KEY = "engmatch-notebook-entries-v2";
const LEGACY_NOTEBOOK_KEY = "engmatch-notebook";

export type NotebookEntryKind = "Vocabulary" | "Grammar point";
export type NotebookCategorySort = "newest" | "alphabetical";

export type NotebookCategory = {
  id: string;
  name: string;
  createdAt: string;
  isDefault: boolean;
};

export type NotebookEntry = {
  id: string;
  categoryId: string;
  categoryName: string;
  kind: NotebookEntryKind;
  term: string;
  meaning: string;
  explanation: string;
  personalNotes: string;
  createdAt: string;
  updatedAt: string;
  source: "manual" | "speaking-feedback";
};

type LegacyNotebookEntry = {
  id: string;
  category?: string;
  content?: string;
  addedAt?: string;
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getDefaultNotebookCategories(): NotebookCategory[] {
  return DEFAULT_NOTEBOOK_CATEGORIES.map((name, index) => ({
    id: `default-${index + 1}`,
    name,
    createdAt: new Date(Date.UTC(2026, 3, 1 + index)).toISOString(),
    isDefault: true,
  }));
}

function normalizeCategories(categories: NotebookCategory[]) {
  const map = new Map<string, NotebookCategory>();

  for (const category of [...getDefaultNotebookCategories(), ...categories]) {
    const key = category.name.trim().toLowerCase();
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, {
        ...category,
        name: category.name.trim(),
      });
    }
  }

  return Array.from(map.values());
}

export function readNotebookCategories(): NotebookCategory[] {
  if (typeof window === "undefined") return getDefaultNotebookCategories();
  const stored = safeParse<NotebookCategory[]>(localStorage.getItem(NOTEBOOK_CATEGORIES_KEY), []);
  return normalizeCategories(stored);
}

export function writeNotebookCategories(categories: NotebookCategory[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(NOTEBOOK_CATEGORIES_KEY, JSON.stringify(normalizeCategories(categories)));
}

function inferKind(categoryName: string, content: string): NotebookEntryKind {
  const joined = `${categoryName} ${content}`.toLowerCase();
  return joined.includes("grammar") ? "Grammar point" : "Vocabulary";
}

function migrateLegacyEntries(
  legacyEntries: LegacyNotebookEntry[],
  categories: NotebookCategory[],
): NotebookEntry[] {
  return legacyEntries.map((entry) => {
    const categoryName = entry.category?.trim() || "Speaking";
    const existingCategory =
      categories.find((category) => category.name.toLowerCase() === categoryName.toLowerCase()) ??
      categories.find((category) => category.name === "Speaking") ??
      categories[0];
    const content = entry.content?.trim() || "Untitled note";
    const [termLine, ...rest] = content.split("\n");
    const explanation = rest.join("\n").trim();
    const createdAt = entry.addedAt || new Date().toISOString();

    return {
      id: entry.id || makeId("entry"),
      categoryId: existingCategory.id,
      categoryName: existingCategory.name,
      kind: inferKind(categoryName, content),
      term: termLine.replace(/^\[[^\]]+\]\s*/u, "").trim() || "Untitled note",
      meaning: explanation ? explanation.slice(0, 180) : "",
      explanation,
      personalNotes: "",
      createdAt,
      updatedAt: createdAt,
      source: "speaking-feedback",
    };
  });
}

export function readNotebookEntries(): NotebookEntry[] {
  if (typeof window === "undefined") return [];

  const categories = readNotebookCategories();
  const stored = safeParse<NotebookEntry[]>(localStorage.getItem(NOTEBOOK_ENTRIES_KEY), []);
  const legacyEntries = safeParse<LegacyNotebookEntry[]>(localStorage.getItem(LEGACY_NOTEBOOK_KEY), []);

  if (stored.length > 0) {
    return stored;
  }

  if (legacyEntries.length > 0) {
    const migrated = migrateLegacyEntries(legacyEntries, categories);
    writeNotebookEntries(migrated);
    return migrated;
  }

  return [];
}

export function writeNotebookEntries(entries: NotebookEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(NOTEBOOK_ENTRIES_KEY, JSON.stringify(entries));
}

export function ensureNotebookCategory(name: string) {
  const normalizedName = name.trim();
  if (!normalizedName) {
    return readNotebookCategories()[0];
  }

  const categories = readNotebookCategories();
  const existing = categories.find((category) => category.name.toLowerCase() === normalizedName.toLowerCase());
  if (existing) return existing;

  const nextCategory: NotebookCategory = {
    id: makeId("category"),
    name: normalizedName,
    createdAt: new Date().toISOString(),
    isDefault: false,
  };

  const nextCategories = [...categories, nextCategory];
  writeNotebookCategories(nextCategories);
  return nextCategory;
}

export function addNotebookCategory(name: string) {
  return ensureNotebookCategory(name);
}

export function addNotebookEntry(input: {
  categoryName: string;
  kind?: NotebookEntryKind;
  term: string;
  meaning?: string;
  explanation?: string;
  personalNotes?: string;
  source?: NotebookEntry["source"];
}) {
  const category = ensureNotebookCategory(input.categoryName);
  const entries = readNotebookEntries();
  const now = new Date().toISOString();
  const nextEntry: NotebookEntry = {
    id: makeId("entry"),
    categoryId: category.id,
    categoryName: category.name,
    kind: input.kind ?? "Vocabulary",
    term: input.term.trim(),
    meaning: input.meaning?.trim() ?? "",
    explanation: input.explanation?.trim() ?? "",
    personalNotes: input.personalNotes?.trim() ?? "",
    createdAt: now,
    updatedAt: now,
    source: input.source ?? "manual",
  };

  writeNotebookEntries([nextEntry, ...entries]);
  return nextEntry;
}

export function updateNotebookEntry(entryId: string, patch: Partial<NotebookEntry>) {
  const entries = readNotebookEntries();
  const nextEntries = entries.map((entry) =>
    entry.id === entryId
      ? {
          ...entry,
          ...patch,
          updatedAt: new Date().toISOString(),
        }
      : entry,
  );
  writeNotebookEntries(nextEntries);
  return nextEntries;
}

export function sortNotebookCategories(
  categories: NotebookCategory[],
  sort: NotebookCategorySort,
) {
  return [...categories].sort((a, b) => {
    if (sort === "alphabetical") {
      return a.name.localeCompare(b.name);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
