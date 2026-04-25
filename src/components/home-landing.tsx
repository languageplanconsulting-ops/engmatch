"use client";

import Link from "next/link";
import { HomeAdminLogin } from "@/components/home-admin-login";
import { HomeStudentLogin } from "@/components/home-student-login";

type IconProps = {
  className?: string;
};

function iconClassName(className?: string) {
  return className ?? "h-5 w-5";
}

function MicIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName(className)} aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M6 11a6 6 0 0 0 12 0" />
      <path d="M12 17v4" />
      <path d="M8 21h8" />
    </svg>
  );
}

function PenIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName(className)} aria-hidden="true">
      <path d="M4 20l4.5-1 9.3-9.3a2.2 2.2 0 1 0-3.1-3.1L5.4 15.9 4 20Z" />
      <path d="m13.5 7.5 3 3" />
    </svg>
  );
}

function BookIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName(className)} aria-hidden="true">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22Z" />
      <path d="M8 7h8" />
      <path d="M8 11h8" />
    </svg>
  );
}

function HeadphonesIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName(className)} aria-hidden="true">
      <path d="M4 13a8 8 0 0 1 16 0" />
      <rect x="3" y="12" width="4" height="8" rx="2" />
      <rect x="17" y="12" width="4" height="8" rx="2" />
    </svg>
  );
}

function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName(className)} aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClassName(className)} aria-hidden="true">
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

function UserIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName(className)} aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

const featureCards = [
  {
    title: "Personalized Speaking Feedback",
    subtitle: "ฟีดแบ็กการพูดแบบเจาะจงส่วนบุคคล",
    body: "Practice with real mock tests using the latest exam questions. Get real criticism and actionable advice on what to improve to get a higher score.",
    bodyThai: "ฝึกจำลองสอบจริงด้วยชุดข้อสอบล่าสุด รับคำวิจารณ์ตามจริงและคำแนะนำเพื่อเพิ่มคะแนน",
    icon: MicIcon,
    tint: "bg-[#004aad]/10 text-[#004aad]",
    items: [
      { en: "Grammar accuracy", th: "ความถูกต้องของไวยากรณ์" },
      { en: "Fluency and Flow", th: "ความลื่นไหลเป็นธรรมชาติ" },
      { en: "Vocabulary usage", th: "การเลือกใช้คำศัพท์" },
      { en: "Pronunciation correction", th: "การแก้ไขการออกเสียง" },
    ],
  },
  {
    title: "Advanced Writing Practice",
    subtitle: "ฝึกฝนการเขียนระดับสูง",
    body: "Complete mock tests based on real exam standards. Receive detailed structural and grammatical feedback to perfect your essays.",
    bodyThai: "ทำข้อสอบจำลองอิงมาตรฐานจริง รับฟีดแบ็กโครงสร้างและไวยากรณ์อย่างละเอียดเพื่อให้เรียงความของคุณสมบูรณ์แบบ",
    icon: PenIcon,
    tint: "bg-blue-100 text-blue-600",
    items: [
      { en: "Task 1 & Task 2 practice", th: "แบบฝึกหัด Task 1 และ Task 2" },
      { en: "Coherence & Cohesion", th: "การเชื่อมโยงและร้อยเรียงเนื้อหา" },
      { en: "Real exam evaluation", th: "ประเมินผลตามเกณฑ์ข้อสอบจริง" },
    ],
  },
  {
    title: "Strategic Reading",
    subtitle: "การอ่านแบบมีกลยุทธ์",
    body: "Master the reading section from quick mini-practices to full 60-minute mock tests. Learn exact strategies.",
    bodyThai: "พิชิตพาร์ทการอ่านตั้งแต่แบบฝึกหัดย่อยไปจนถึงข้อสอบจำลองเต็ม 60 นาที เรียนรู้กลยุทธ์ที่แม่นยำ",
    icon: BookIcon,
    tint: "bg-fuchsia-100 text-fuchsia-700",
    items: [
      { en: "Mini practice sessions", th: "แบบฝึกหัดย่อยเพื่อความรวดเร็ว" },
      { en: "How to read & find keywords", th: "เทคนิคการอ่านและหาคีย์เวิร์ด" },
      { en: "Full mock test with real explanations", th: "ข้อสอบจำลองเต็มรูปแบบพร้อมคำอธิบายจริง" },
    ],
  },
  {
    title: "Active Listening",
    subtitle: "การฟังอย่างมีประสิทธิภาพ",
    body: "Tune your ears to various accents. Practice breaking down audio tracks and identifying answers before they are spoken.",
    bodyThai: "ปรับหูให้ชินกับสำเนียงที่หลากหลาย ฝึกแยกแยะเสียงและหาคำตอบล่วงหน้า",
    icon: HeadphonesIcon,
    tint: "bg-teal-100 text-teal-700",
    items: [
      { en: "Targeted mini practice", th: "แบบฝึกหัดย่อยเฉพาะจุด" },
      { en: "Keyword spotting techniques", th: "เทคนิคการดักฟังคีย์เวิร์ด" },
      { en: "Full mock test with full explanation", th: "ข้อสอบจำลองเต็มรูปแบบพร้อมคำอธิบายแบบละเอียด" },
    ],
  },
];

export function HomeLanding() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex shrink-0 flex-col justify-center">
            <span className="font-[ui-rounded,'Avenir_Next','Nunito_Sans',sans-serif] text-2xl font-extrabold tracking-tight text-[#004aad]">
              IELTS<span className="text-slate-800">Workspace</span>
            </span>
            <span className="text-xs font-medium text-slate-500">by English Plan</span>
          </div>

          <div className="hidden md:block">
            <div className="w-[420px] max-w-full">
              <HomeStudentLogin compact />
            </div>
          </div>

          <a href="#student-login" className="text-sm font-medium text-[#004aad] md:hidden">
            Log in / เข้าสู่ระบบ
          </a>
        </div>
      </nav>

      <section className="overflow-hidden bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-8 inline-flex items-center rounded-full bg-[#004aad]/10 px-4 py-2 text-center text-sm font-medium text-[#004aad]">
              <span>Exclusive Workspace for English Plan Students • พื้นที่ฝึกฝนเฉพาะสำหรับนักเรียน English Plan</span>
            </div>
            <h1 className="mb-4 font-[ui-rounded,'Avenir_Next','Nunito_Sans',sans-serif] text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
              Practice smarter, <span className="text-[#004aad]">score higher.</span>
            </h1>
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-slate-700 sm:text-3xl">
              ฝึกฝนอย่างชาญฉลาด เพื่อคะแนนที่สูงกว่า
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-500">
              Get real criticism, practice with the latest exams, and master your skills in your private student workspace.
              <span className="mt-2 block text-base text-slate-400">
                รับคำวิจารณ์จากข้อสอบจริง ฝึกฝนด้วยข้อสอบล่าสุด และพัฒนาทักษะในพื้นที่ส่วนตัวสำหรับนักเรียน
              </span>
            </p>
            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <a
                href="#student-login"
                className="inline-flex items-center justify-center rounded-md bg-[#ffcc00] px-8 py-3 text-base font-semibold text-slate-900 shadow-lg transition hover:bg-[#e6b800] hover:shadow-xl"
              >
                Student Login
                <UserIcon className="ml-2 h-5 w-5" />
              </a>
              <a
                href="#student-login"
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-8 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-50"
              >
                เข้าสู่ระบบสำหรับนักเรียน
              </a>
            </div>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-500">
              <Link href="/speaking" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 font-medium hover:border-[#004aad]/30 hover:text-[#004aad]">
                Speaking
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link href="/writing" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 font-medium hover:border-[#004aad]/30 hover:text-[#004aad]">
                Writing
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link href="/reading" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 font-medium hover:border-[#004aad]/30 hover:text-[#004aad]">
                Reading
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link href="/listening" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 font-medium hover:border-[#004aad]/30 hover:text-[#004aad]">
                Listening
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <a href="#admin-login" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 font-medium hover:border-slate-900/30 hover:text-slate-900">
                Admin
                <ArrowRightIcon className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="font-[ui-rounded,'Avenir_Next','Nunito_Sans',sans-serif] text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Complete IELTS Preparation
            </h2>
            <p className="mt-2 text-xl font-medium text-slate-600">
              เตรียมสอบ IELTS ครบทุกทักษะ
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12">
            {featureCards.map((card) => {
              const Icon = card.icon;

              return (
                <article
                  key={card.title}
                  className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md"
                >
                  <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-xl ${card.tint}`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="mb-1 text-2xl font-bold text-slate-900">{card.title}</h3>
                  <h4 className="mb-4 text-lg font-medium text-slate-500">{card.subtitle}</h4>
                  <p className="mb-6 text-slate-600">
                    {card.body}
                    <span className="mt-2 block text-sm text-slate-500">{card.bodyThai}</span>
                  </p>
                  <ul className="space-y-3">
                    {card.items.map((item) => (
                      <li key={item.en} className="flex items-start">
                        <CheckIcon className="mt-0.5 mr-3 h-5 w-5 shrink-0 text-emerald-500" />
                        <div>
                          <span className="font-medium text-slate-700">{item.en}</span>
                          <span className="block text-sm text-slate-500">{item.th}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="student-login" className="bg-[#004aad] text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="mb-4 font-[ui-rounded,'Avenir_Next','Nunito_Sans',sans-serif] text-3xl font-bold">English Plan Student Access</h2>
          <h3 className="mb-8 text-xl font-medium text-[#ffcc00]">เข้าสู่ระบบสำหรับนักเรียน IELTS จาก English Plan</h3>
          <div className="mx-auto max-w-md">
            <HomeStudentLogin />
          </div>
        </div>
      </section>

      <section id="admin-login" className="bg-slate-100 py-18">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <HomeAdminLogin />
        </div>
      </section>

      <footer className="bg-slate-900 py-10">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-slate-400">&copy; 2026 English Plan. All rights reserved.</p>
          <p className="mt-1 text-sm text-slate-500">สงวนลิขสิทธิ์</p>
        </div>
      </footer>
    </div>
  );
}
