import Link from "next/link";
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

      <SpeakingAdminPanel />
    </div>
  );
}
