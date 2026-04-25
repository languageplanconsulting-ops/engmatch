import Link from "next/link";
import { requireStudentSkillAccess } from "@/lib/student-access";

const skillLabels = {
  speaking: "Speaking",
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
} as const;

export async function StudentAccessGuard({
  skill,
  children,
}: {
  skill: keyof typeof skillLabels;
  children: React.ReactNode;
}) {
  const session = await requireStudentSkillAccess(skill);

  return (
    <div className="stack-md">
      <div className="section-banner">
        {session.role === "admin" ? (
          <>
            <span>{skillLabels[skill]} admin preview</span>
            <p>
              You are viewing this section with admin override access. This preview bypasses the normal
              student email gate so you can check the experience directly.
            </p>
          </>
        ) : (
          <>
            <span>{skillLabels[skill]} access active</span>
            <p>
              Signed in as <strong>{session.grant.email}</strong>. Access for this section is active until{" "}
              <strong>{session.grant.expiresAt.toLocaleDateString("en-CA")}</strong>.
            </p>
          </>
        )}
      </div>
      {children}
      <div className="callout">
        <p>
          {session.role === "admin"
            ? <>You can update student access anytime from <Link href="/admin/access">Admin Access</Link>.</>
            : <>Need changes to your study access or expiry date? Check your <Link href="/notifications">notifications</Link>{" "}
            or contact your teacher/admin.</>}
        </p>
      </div>
    </div>
  );
}
