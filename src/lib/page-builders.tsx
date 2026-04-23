import Link from "next/link";
import type { ReactNode } from "react";

type Breadcrumb = {
  href?: string;
  label: string;
};

type Panel = {
  title: string;
  body: string;
};

type RouteLink = {
  href: string;
  label: string;
};

const TEMPORARILY_LOCKED_SECTIONS = new Set(["Listening", "Reading", "Writing"]);
const SECTION_REOPEN_DATE_LABEL = "April 29, 2026";
const SECTION_REOPEN_AT = new Date("2026-04-30T00:00:00+07:00");

export function isSectionTemporarilyUnavailable(section: string) {
  return TEMPORARILY_LOCKED_SECTIONS.has(section) && Date.now() < SECTION_REOPEN_AT.getTime();
}

export function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand-lockup">
          <Link className="brand" href="/">
            Engmatch
          </Link>
          <p className="brand-tag">IELTS Architect Notebook</p>
        </div>
        <nav className="topnav" aria-label="Primary">
          <Link href="/listening">
            Listening
            {isSectionTemporarilyUnavailable("Listening") ? <span className="topnav-badge">Soon</span> : null}
          </Link>
          <Link href="/reading">
            Reading
            {isSectionTemporarilyUnavailable("Reading") ? <span className="topnav-badge">Soon</span> : null}
          </Link>
          <Link href="/speaking">Speaking</Link>
          <Link href="/writing">
            Writing
            {isSectionTemporarilyUnavailable("Writing") ? <span className="topnav-badge">Soon</span> : null}
          </Link>
          <Link href="/notebook">Notebook</Link>
          <Link href="/notifications">Notifications</Link>
          <Link href="/admin">Teacher/Admin</Link>
        </nav>
      </header>
      <main className="content">
        {children}
      </main>
    </div>
  );
}

export function PlaceholderPage({
  title,
  description,
  breadcrumbs,
  panels,
  links,
}: {
  title: string;
  description: string;
  breadcrumbs: Breadcrumb[];
  panels: Panel[];
  links: RouteLink[];
}) {
  return (
    <section className="stack-lg">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, index) => (
          <span key={`${crumb.label}-${index}`}>
            {crumb.href ? <Link href={crumb.href}>{crumb.label}</Link> : crumb.label}
            {index < breadcrumbs.length - 1 ? " / " : ""}
          </span>
        ))}
      </nav>

      <div className="section-header">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      <div className="panel-grid">
        {panels.map((panel) => (
          <article className="panel" key={panel.title}>
            <h3>{panel.title}</h3>
            <p>{panel.body}</p>
          </article>
        ))}
      </div>

      <div className="route-grid">
        {links.map((link) => (
          <Link className="route-card" href={link.href} key={link.href}>
            <span>{link.label}</span>
            <strong>Open</strong>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function SectionLayout({
  section,
  children,
}: {
  section: string;
  children: ReactNode;
}) {
  const isLocked = isSectionTemporarilyUnavailable(section);

  return (
    <div className="stack-md">
      <div className="section-banner">
        <span>{section}</span>
        <p>
          {isLocked
            ? `This section is temporarily closed for students and will reopen on ${SECTION_REOPEN_DATE_LABEL}.`
            : "Choose a section to continue your IELTS practice."}
        </p>
      </div>
      {isLocked ? <TemporarySectionNotice section={section} /> : children}
    </div>
  );
}

export function MetricList({
  items,
}: {
  items: { id: string; label: string; value: string }[];
}) {
  return (
    <div className="metric-grid">
      {items.map((item) => (
        <article className="metric-card" key={item.id}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </div>
  );
}

export function TemporarySectionNotice({
  section,
}: {
  section: string;
}) {
  return (
    <section className="stack-lg">
      <div className="callout coming-soon-callout">
        <p className="eyebrow">Coming Soon</p>
        <h2>{section} is temporarily unavailable</h2>
        <p>
          We are polishing the student experience for this section. Public access is paused until{" "}
          <strong>{SECTION_REOPEN_DATE_LABEL}</strong>.
        </p>
        <p>
          Speaking is available now, and teachers can still review materials from the admin area while
          we finish the update.
        </p>
        <div className="coming-soon-actions">
          <Link className="route-card coming-soon-card" href="/speaking">
            <span>Speaking is live</span>
            <strong>Open</strong>
          </Link>
          <Link className="route-card coming-soon-card" href="/admin">
            <span>Teacher/Admin access</span>
            <strong>Open</strong>
          </Link>
        </div>
      </div>
    </section>
  );
}
