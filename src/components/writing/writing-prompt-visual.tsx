import type { WritingPrompt } from "@/lib/writing-demo";

export function WritingPromptVisual({ prompt }: { prompt: WritingPrompt }) {
  if (!prompt.visual) {
    return null;
  }

  if (prompt.visual.type === "chart") {
    return (
      <section className="visual-card">
        <div className="visual-header">
          <strong>{prompt.visual.title}</strong>
          <p>{prompt.visual.caption}</p>
        </div>
        <div className="chart-bars" aria-label={prompt.visual.title}>
          {prompt.visual.bars.map((bar) => (
            <article className="chart-bar" key={bar.label}>
              <div className="chart-track">
                <div
                  className="chart-fill"
                  style={{ width: `${bar.value}%`, background: bar.color }}
                />
              </div>
              <div className="chart-meta">
                <span>{bar.label}</span>
                <strong>{bar.value}%</strong>
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="visual-card">
      <div className="visual-header">
        <strong>{prompt.visual.title}</strong>
        <p>{prompt.visual.caption}</p>
      </div>
      <div className="visual-placeholder">
        <div className="visual-map-block visual-map-a" />
        <div className="visual-map-block visual-map-b" />
        <div className="visual-map-line" />
      </div>
    </section>
  );
}
