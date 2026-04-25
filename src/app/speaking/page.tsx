import Link from "next/link";
import { speakingModes } from "@/lib/speaking-demo";

export default function SpeakingPage() {
  return (
    <section className="stack-lg">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <span>
          <Link href="/">Home</Link> /{" "}
        </span>
        <span>Speaking</span>
      </nav>

      <div className="section-header">
        <h2>Speaking</h2>
        <p>Choose the speaking format you want to run.</p>
      </div>

      <div className="route-grid">
        {speakingModes.map((mode) => (
          <Link className="route-card speaking-mode-card" href={mode.href} key={mode.slug}>
            <span>{mode.title}</span>
            <strong>Open</strong>
          </Link>
        ))}
        <Link className="route-card speaking-mode-card" href="/speaking/report">
          <span>Submit Speaking Report (Text + Audio)</span>
          <strong>Open</strong>
        </Link>
      </div>
    </section>
  );
}
