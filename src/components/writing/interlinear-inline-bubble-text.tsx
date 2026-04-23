/**
 * Renders inline note text so the first line sits closest to the highlighted
 * phrase and further lines stack upward (use Shift+Enter in the inline editor
 * for extra lines).
 */
export function InterlinearInlineBubbleText({
  text,
  variant,
}: {
  text: string;
  variant: "tr" | "pdf";
}) {
  const stackClass = variant === "pdf" ? "pdf-ann-bubble-stack" : "tr-ann-bubble-stack";
  const lineClass = variant === "pdf" ? "pdf-ann-bubble-line" : "tr-ann-bubble-line";
  const singleClass = variant === "pdf" ? "pdf-ann-bubble-text" : "tr-ann-bubble-text";

  if (!text.includes("\n")) {
    return <span className={singleClass}>{text}</span>;
  }

  return (
    <span className={stackClass}>
      {text.split("\n").map((line, index) => (
        <span key={index} className={lineClass}>
          {line.length > 0 ? line : "\u00a0"}
        </span>
      ))}
    </span>
  );
}
