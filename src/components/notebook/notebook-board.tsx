"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addNotebookCategory,
  addNotebookEntry,
  DEFAULT_NOTEBOOK_CATEGORIES,
  readNotebookCategories,
  readNotebookEntries,
  sortNotebookCategories,
  type NotebookCategory,
  type NotebookCategorySort,
  type NotebookEntry,
  type NotebookEntryKind,
  updateNotebookEntry,
} from "@/lib/notebook-storage";

type DraftState = {
  categoryName: string;
  kind: NotebookEntryKind;
  term: string;
  meaning: string;
  explanation: string;
  personalNotes: string;
};

const INITIAL_DRAFT: DraftState = {
  categoryName: DEFAULT_NOTEBOOK_CATEGORIES[0],
  kind: "Vocabulary",
  term: "",
  meaning: "",
  explanation: "",
  personalNotes: "",
};

export function NotebookBoard() {
  const [categories, setCategories] = useState<NotebookCategory[]>([]);
  const [entries, setEntries] = useState<NotebookEntry[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [sortMode, setSortMode] = useState<NotebookCategorySort>("newest");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [draft, setDraft] = useState<DraftState>(INITIAL_DRAFT);

  useEffect(() => {
    setCategories(readNotebookCategories());
    setEntries(readNotebookEntries());
  }, []);

  const sortedCategories = useMemo(
    () => sortNotebookCategories(categories, sortMode),
    [categories, sortMode],
  );

  const filteredEntries = useMemo(() => {
    if (selectedCategoryId === "all") return entries;
    return entries.filter((entry) => entry.categoryId === selectedCategoryId);
  }, [entries, selectedCategoryId]);

  function refreshNotebook() {
    setCategories(readNotebookCategories());
    setEntries(readNotebookEntries());
  }

  function handleCreateCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    const createdCategory = addNotebookCategory(name);
    refreshNotebook();
    setSelectedCategoryId(createdCategory.id);
    setDraft((current) => ({ ...current, categoryName: createdCategory.name }));
    setNewCategoryName("");
  }

  function handleSaveNote() {
    if (!draft.term.trim()) return;
    addNotebookEntry({
      categoryName: draft.categoryName,
      kind: draft.kind,
      term: draft.term,
      meaning: draft.meaning,
      explanation: draft.explanation,
      personalNotes: draft.personalNotes,
      source: "manual",
    });
    refreshNotebook();
    setDraft((current) => ({
      ...INITIAL_DRAFT,
      categoryName: current.categoryName,
      kind: current.kind,
    }));
  }

  function handlePersonalNotesChange(entry: NotebookEntry, personalNotes: string) {
    updateNotebookEntry(entry.id, { personalNotes });
    setEntries(readNotebookEntries());
  }

  return (
    <section className="stack-lg">
      <div className="section-header">
        <h2>Notebook</h2>
        <p>
          Organize vocabulary, grammar points, and skill-specific study notes as sticky cards. Default
          categories are ready to use, and you can add your own anytime.
        </p>
      </div>

      <div className="notebook-shell">
        <aside className="notebook-sidebar">
          <article className="callout notebook-panel">
            <p className="eyebrow">Categories</p>
            <div className="notebook-sort-row">
              <label className="field-block">
                <span>Order</span>
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as NotebookCategorySort)}
                >
                  <option value="newest">Newest first</option>
                  <option value="alphabetical">Alphabetical</option>
                </select>
              </label>
            </div>

            <div className="notebook-category-list">
              <button
                type="button"
                className={`notebook-category-chip${selectedCategoryId === "all" ? " is-active" : ""}`}
                onClick={() => setSelectedCategoryId("all")}
              >
                All notes
              </button>
              {sortedCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`notebook-category-chip${selectedCategoryId === category.id ? " is-active" : ""}`}
                  onClick={() => {
                    setSelectedCategoryId(category.id);
                    setDraft((current) => ({ ...current, categoryName: category.name }));
                  }}
                >
                  {category.name}
                </button>
              ))}
            </div>

            <div className="notebook-new-category">
              <label className="field-block">
                <span>Add new category</span>
                <input
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder="Exam mistakes, Collocations, Idioms..."
                />
              </label>
              <button type="button" className="action-button action-button-primary" onClick={handleCreateCategory}>
                Add category
              </button>
            </div>
          </article>

          <article className="callout notebook-panel">
            <p className="eyebrow">New note</p>
            <div className="notebook-form">
              <label className="field-block">
                <span>Category</span>
                <select
                  value={draft.categoryName}
                  onChange={(event) => setDraft((current) => ({ ...current, categoryName: event.target.value }))}
                >
                  {sortedCategories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field-block">
                <span>Type</span>
                <select
                  value={draft.kind}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, kind: event.target.value as NotebookEntryKind }))
                  }
                >
                  <option value="Vocabulary">Vocabulary</option>
                  <option value="Grammar point">Grammar point</option>
                </select>
              </label>

              <label className="field-block">
                <span>{draft.kind === "Vocabulary" ? "Vocabulary item" : "Grammar point"}</span>
                <input
                  value={draft.term}
                  onChange={(event) => setDraft((current) => ({ ...current, term: event.target.value }))}
                  placeholder={draft.kind === "Vocabulary" ? "run out of, crucial, coherent..." : "subject-verb agreement"}
                />
              </label>

              <label className="field-block">
                <span>Meaning</span>
                <input
                  value={draft.meaning}
                  onChange={(event) => setDraft((current) => ({ ...current, meaning: event.target.value }))}
                  placeholder="Short meaning or correction"
                />
              </label>

              <label className="field-block">
                <span>Explanation</span>
                <textarea
                  className="writing-textarea notebook-textarea"
                  value={draft.explanation}
                  onChange={(event) => setDraft((current) => ({ ...current, explanation: event.target.value }))}
                  placeholder="Why it matters, example sentence, mistake pattern, memory trick..."
                />
              </label>

              <label className="field-block">
                <span>Your own notes</span>
                <textarea
                  className="writing-textarea notebook-textarea notebook-textarea-handwritten"
                  value={draft.personalNotes}
                  onChange={(event) => setDraft((current) => ({ ...current, personalNotes: event.target.value }))}
                  placeholder="Write your own note here..."
                />
              </label>

              <button type="button" className="action-button action-button-primary" onClick={handleSaveNote}>
                Save to notebook
              </button>
            </div>
          </article>
        </aside>

        <div className="notebook-board-area">
          {filteredEntries.length === 0 ? (
            <article className="callout notebook-empty-state">
              <p className="eyebrow">No notes yet</p>
              <h3>Your sticky notes will appear here</h3>
              <p>
                Start with vocabulary or grammar, choose a category, and save your first note. Notes from
                speaking feedback will also appear here automatically.
              </p>
            </article>
          ) : (
            <div className="notebook-sticky-grid">
              {filteredEntries.map((entry, index) => (
                <article
                  key={entry.id}
                  className={`notebook-sticky-note sticky-tone-${(index % 4) + 1}`}
                >
                  <div className="notebook-sticky-top">
                    <span className="notebook-note-category">{entry.categoryName}</span>
                    <span className="notebook-note-kind">{entry.kind}</span>
                  </div>

                  <h3 className="notebook-note-term">{entry.term || "Untitled note"}</h3>

                  <div className="notebook-note-block">
                    <strong>Meaning</strong>
                    <p>{entry.meaning || "—"}</p>
                  </div>

                  <div className="notebook-note-block">
                    <strong>Explanation</strong>
                    <p>{entry.explanation || "—"}</p>
                  </div>

                  <label className="notebook-note-block notebook-note-handwritten">
                    <strong>Your notes</strong>
                    <textarea
                      className="writing-textarea notebook-textarea notebook-textarea-handwritten"
                      value={entry.personalNotes}
                      onChange={(event) => handlePersonalNotesChange(entry, event.target.value)}
                      placeholder="Write your own reminder..."
                    />
                  </label>

                  <div className="notebook-note-meta">
                    <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                    <span>{entry.source === "speaking-feedback" ? "From speaking" : "Manual note"}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
