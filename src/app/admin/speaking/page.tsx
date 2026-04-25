import Link from "next/link";
import { SpeakingAdminHealthPanel } from "@/components/speaking/speaking-admin-health-panel";
import { SpeakingAdminPanel } from "@/components/speaking/speaking-admin-panel";

export default function AdminSpeakingPage() {
  return (
    <div className="stack-lg">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <span>
          <Link href="/">Home</Link> /{" "}
        </span>
        <span>Admin Speaking</span>
      </nav>

      <div className="section-header">
        <h2>Speaking Admin</h2>
        <p>Upload Part 1, Part 2, and Part 3 speaking packs with saved TTS and Deepgram metadata.</p>
      </div>

      <div className="list-card">
        <h3>Submission Review Queue</h3>
        <p>Listen to user audio before validating pre-generated AI feedback.</p>
        <Link href="/admin/speaking/submissions" className="sp-ready-btn">
          Open speaking submissions →
        </Link>
      </div>

      <div className="list-card">
        <h3>Multi-model assess test</h3>
        <p>
          Paste a Part 2 transcript and generate the full report once per model (Gemini, Claude, ChatGPT) for
          comparison.
        </p>
        <Link href="/admin/speaking/assess-test" className="sp-ready-btn">
          Open assess test →
        </Link>
      </div>

      <SpeakingAdminHealthPanel />

      <SpeakingAdminPanel />
    </div>
  );
}
