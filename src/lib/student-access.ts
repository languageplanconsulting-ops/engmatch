import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const STUDENT_SESSION_COOKIE = "engmatch_student_email";

export const SKILL_KEYS = ["speaking", "reading", "listening", "writing"] as const;

export type SkillKey = (typeof SKILL_KEYS)[number];

export type SkillAccessMap = Record<SkillKey, boolean>;

export type ViewerSession =
  | { role: "admin" }
  | {
      role: "student";
      grant: {
        email: string;
        expiresAt: Date;
      };
    };

export function normalizeStudentEmail(email: string) {
  return email.trim().toLowerCase();
}

export function defaultAccessExpiryDate(from = new Date()) {
  const expiry = new Date(from);
  expiry.setMonth(expiry.getMonth() + 6);
  return expiry;
}

export function getSkillAccessFlags(input: Partial<SkillAccessMap>): SkillAccessMap {
  return {
    speaking: input.speaking ?? true,
    reading: input.reading ?? true,
    listening: input.listening ?? true,
    writing: input.writing ?? true,
  };
}

export function accessHasAnyEnabledSkill(access: SkillAccessMap) {
  return SKILL_KEYS.some((key) => access[key]);
}

export function studentGrantToSkillAccess(grant: {
  speakingEnabled: boolean;
  readingEnabled: boolean;
  listeningEnabled: boolean;
  writingEnabled: boolean;
}): SkillAccessMap {
  return {
    speaking: grant.speakingEnabled,
    reading: grant.readingEnabled,
    listening: grant.listeningEnabled,
    writing: grant.writingEnabled,
  };
}

export function hasStudentGrantExpired(expiresAt: Date) {
  return expiresAt.getTime() < Date.now();
}

export async function getStudentSessionEmail() {
  const cookieStore = await cookies();
  return normalizeStudentEmail(cookieStore.get(STUDENT_SESSION_COOKIE)?.value ?? "");
}

export async function getCurrentStudentGrant() {
  const email = await getStudentSessionEmail();
  if (!email) {
    return null;
  }

  const grant = await prisma.studentAccessGrant.findUnique({
    where: { email },
  });

  if (!grant || hasStudentGrantExpired(grant.expiresAt)) {
    return null;
  }

  return grant;
}

export async function requireStudentSkillAccess(skill: SkillKey) {
  const isAdmin = await isAdminAuthenticated();
  if (isAdmin) {
    return { role: "admin" } as const;
  }

  const email = await getStudentSessionEmail();
  if (!email) {
    redirect("/?login=required");
  }

  const grant = await prisma.studentAccessGrant.findUnique({
    where: { email },
  });

  if (!grant) {
    redirect("/?login=missing");
  }

  if (hasStudentGrantExpired(grant.expiresAt)) {
    redirect("/?login=expired");
  }

  const skillAccess = studentGrantToSkillAccess(grant);
  if (!skillAccess[skill]) {
    redirect(`/?login=restricted&skill=${skill}`);
  }

  return {
    role: "student",
    grant,
  } as const;
}

export async function createAccessNotification({
  accessId,
  email,
  expiresAt,
  access,
}: {
  accessId: string;
  email: string;
  expiresAt: Date;
  access: SkillAccessMap;
}) {
  const enabledSkills = SKILL_KEYS.filter((key) => access[key]).map((key) => key[0].toUpperCase() + key.slice(1));
  const description = enabledSkills.length
    ? `Your access has been updated. Active skills: ${enabledSkills.join(", ")}. Access expires on ${expiresAt.toLocaleDateString("en-CA")}.`
    : `Your access record was updated, but no study skills are currently enabled. Contact your teacher if this looks incorrect.`;

  return prisma.studentNotification.create({
    data: {
      accessId,
      email,
      category: "system",
      title: "Workspace access updated",
      description,
    },
  });
}
